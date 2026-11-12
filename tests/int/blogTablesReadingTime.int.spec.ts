import { getPayload, type Payload } from 'payload'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  isShortCell,
  keepDigitGroups,
  RichText,
  tableColumnCount,
  WIDE_TABLE_COLUMNS,
} from '@/components/RichText'
import { countWords, lexicalPlainText, readingTimeMinutes } from '@/lib/readingTime'

// --- Lexical JSON builders (the same shape the admin editor saves) ---------

const text = (t: string) => ({
  type: 'text',
  text: t,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
const paragraph = (t: string) => ({
  type: 'paragraph',
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  version: 1,
})
const cell = (t: string, headerState = 0) => ({
  type: 'tablecell',
  children: [paragraph(t)],
  headerState,
  colSpan: 1,
  rowSpan: 1,
  backgroundColor: null,
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const row = (cells: ReturnType<typeof cell>[]) => ({
  type: 'tablerow',
  children: cells,
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const table = (rows: string[][]) => ({
  type: 'table',
  children: rows.map((r, i) => row(r.map((t) => cell(t, i === 0 ? 1 : 0)))),
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})
const upload = () => ({
  type: 'upload',
  relationTo: 'media',
  value: {
    id: 1,
    alt: 'A very long alternative text that nobody reads as body copy at all',
    filename: 'camera-line-scan-setup.jpg',
    url: '/api/media/file/camera-line-scan-setup.jpg',
  },
  fields: null,
  format: '',
  version: 3,
})
const doc = (...children: object[]) => ({
  root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
})

const words = (n: number, prefix = 'word') =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ')

// ---------------------------------------------------------------------------

describe('reading time', () => {
  it('counts only visible text, not the Lexical JSON around it', () => {
    const content = doc(paragraph('Hello brave new world'))
    expect(countWords(lexicalPlainText(content))).toBe(4)
    // The old JSON-based count saw dozens of words here (type, format, version …).
    expect(countWords(JSON.stringify(content).replace(/[^\p{L}\p{N}\s]/gu, ' '))).toBeGreaterThan(
      20,
    )
  })

  it('gives about 13 minutes for 3 000 words (the old code gave about 41)', () => {
    const paragraphs = Array.from({ length: 100 }, (_, i) => paragraph(words(30, `p${i}w`)))
    const content = doc(...paragraphs)
    expect(countWords(lexicalPlainText(content))).toBe(3000)
    expect(readingTimeMinutes(content)).toBe(14) // 3000 / 220 = 13.6
  })

  it('counts the words in table cells, one cell never merges into the next', () => {
    const content = doc(
      table([
        ['Model', 'Speed'],
        ['Alpha', '12 ms'],
      ]),
    )
    expect(lexicalPlainText(content).split(/\s+/).filter(Boolean)).toEqual([
      'Model',
      'Speed',
      'Alpha',
      '12',
      'ms',
    ])
  })

  it('does not count image data (alt text, file names, URLs)', () => {
    expect(countWords(lexicalPlainText(doc(paragraph('One two'), upload())))).toBe(2)
  })

  it('returns at least 1 minute, also for empty content', () => {
    expect(readingTimeMinutes(null)).toBe(1)
    expect(readingTimeMinutes(doc())).toBe(1)
  })

  it('keeps words apart across line breaks', () => {
    const p = {
      ...paragraph('a'),
      children: [text('first'), { type: 'linebreak', version: 1 }, text('second')],
    }
    expect(countWords(lexicalPlainText(doc(p)))).toBe(2)
  })
})

describe('table rendering', () => {
  const render = (content: object) =>
    renderToStaticMarkup(React.createElement(RichText, { data: content as never }))

  it('renders a header row, body cells and a sideways-scrolling frame', () => {
    const html = render(
      doc(
        table([
          ['Model', 'Throughput'],
          ['Robopipe S', '120 parts/min'],
          ['Robopipe L', 'A much longer description that is allowed to wrap'],
        ]),
      ),
    )
    expect(html).toContain('data-rich-table')
    expect(html).toMatch(/<div[^>]*class="[^"]*overflow-x-auto[^"]*"/)
    // From lg up, a wide table may grow past the text column, never on phones.
    expect(html).toMatch(/<div[^>]*class="[^"]*max-w-full[^"]*\blg:table-breakout\b[^"]*"/)
    expect(html).not.toMatch(/class="[^"]*(?<![:\w-])table-breakout/)
    expect(html).toMatch(/<th[^>]*scope="col"[^>]*>.*Model/)
    expect(html.match(/<th/g)).toHaveLength(2)
    expect(html.match(/<td/g)).toHaveLength(4)
    // Values and short names stay on one line, long text wraps in a wider column.
    expect(html).toMatch(/<td[^>]*whitespace-nowrap[^>]*><p>120 parts\/min<\/p>/)
    expect(html).toMatch(/<td[^>]*whitespace-nowrap[^>]*><p>Robopipe S<\/p>/)
    expect(html).toMatch(
      /<td class="(?![^"]*whitespace-nowrap)[^"]*min-w-\[14rem\][^"]*"><p>A much longer/,
    )
    // No inline grey borders from the library default converter.
    expect(html).not.toContain('#ccc')
    // A table with few columns keeps the narrowest frame and the normal padding.
    expect(html).not.toContain('data-wide=""')
    expect(html).not.toContain('--table-frame-width')
  })

  it('lets header cells wrap, also short ones, and keeps body numbers on one line', () => {
    const html = render(
      doc(
        table([
          ['Model', 'Cost per 1,000 checks', 'Cost per month (220 000)'],
          ['Gemini 4 Argon', '$9.99', '$2 197'],
        ]),
      ),
    )
    for (const th of html.match(/<th[^>]*>/g) ?? []) {
      expect(th).not.toContain('whitespace-nowrap')
      expect(th).not.toContain('min-w-[14rem]')
      expect(th).toContain('text-balance')
    }
    // On small screens a long header keeps a width for two lines.
    expect(html).toMatch(/<th[^>]*max-lg:min-w-\[7\.5rem\][^>]*><p>Cost per 1,000 checks/)
    expect(html).toMatch(/<th[^>]*class="(?![^"]*max-lg:min-w)[^"]*"[^>]*><p>Model<\/p>/)
    // A number in a header never breaks between its digit groups.
    expect(html).toContain('(220\u00a0000)')
    expect(html).toMatch(/<td[^>]*whitespace-nowrap[^>]*><p>\$2\u00a0197<\/p>/)
    expect(html).toMatch(/<td[^>]*whitespace-nowrap[^>]*><p>Gemini 4 Argon<\/p>/)
  })

  it('gives a table with many columns a wider frame and tighter padding', () => {
    const header = [
      'Model',
      'Where it runs',
      'Reasoning',
      'Detects',
      'Names',
      'Time',
      'Cost',
      'Month',
    ]
    expect(header.length).toBeGreaterThanOrEqual(WIDE_TABLE_COLUMNS)
    const html = render(
      doc(
        table([
          header,
          [
            'Gemini 4 Argon',
            'self-hosted, 1 GPU, detector',
            'low',
            '100%',
            '100%',
            '4.3 s',
            '$9.99',
            '$2,197',
          ],
        ]),
      ),
    )
    expect(html).toMatch(
      /<div[^>]*class="[^"]*lg:table-breakout[^"]*\[--table-frame-width:max-content\][^"]*"[^>]*data-wide=""/,
    )
    expect(html).toMatch(/<td[^>]*in-data-wide:px-3/)
    expect(html).toMatch(
      /<td[^>]*in-data-wide:min-w-\[11rem\][^>]*><p>self-hosted, 1 GPU, detector/,
    )
  })

  it('counts table columns with colSpan', () => {
    const t = table([
      ['A', 'B', 'C'],
      ['1', '2', '3'],
    ])
    expect(tableColumnCount(t as never)).toBe(3)
    t.children[0].children[1].colSpan = 3
    expect(tableColumnCount(t as never)).toBe(5)
    expect(tableColumnCount({ type: 'table', children: [] } as never)).toBe(0)
  })

  it('joins digit groups with a no-break space, nothing else', () => {
    const cells = keepDigitGroups([
      paragraph('Cena za 1 000 ověření (220 000)'),
      paragraph('4 096 × 3 000, 3 GPU, 12 345 678'),
    ])
    expect(cells.map((p) => p.children[0].text)).toEqual([
      'Cena za 1\u00a0000 ověření (220\u00a0000)',
      '4\u00a0096 × 3\u00a0000, 3 GPU, 12\u00a0345\u00a0678',
    ])
    expect(keepDigitGroups(paragraph('3 GPU 2026'))).toEqual(paragraph('3 GPU 2026'))
  })

  it('leaves content without tables as before', () => {
    const html = render(doc(paragraph('Plain text')))
    expect(html).not.toContain('<table')
    expect(html).toContain('<p>Plain text</p>')
  })

  it('keeps short cells (numbers, names) on one line', () => {
    expect(isShortCell('4 096')).toBe(true)
    expect(isShortCell('99.5 %')).toBe(true)
    expect(isShortCell('€ 1,490')).toBe(true)
    expect(isShortCell('Supports 3 cameras on one line at the same time')).toBe(false)
  })
})

describe('posts collection (local database)', () => {
  let payload: Payload
  const created: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) await payload.delete({ collection: 'posts', id })
  })

  it('saves a table node and stores the reading time from visible text', async () => {
    const paragraphs = Array.from({ length: 100 }, (_, i) => paragraph(words(30, `p${i}w`)))
    const content = doc(
      table([
        ['A', 'B'],
        ['1', '2'],
      ]),
      ...paragraphs,
    )
    const post = await payload.create({
      collection: 'posts',
      locale: 'en',
      draft: true,
      data: {
        title: 'Int test table post',
        slug: `int-test-table-${Date.now()}`,
        content: content as never,
        _status: 'draft',
      },
    })
    created.push(post.id as number)
    expect(post.readingTime).toBe(14)
    const root = (post.content as unknown as ReturnType<typeof doc>).root
    expect((root.children[0] as { type: string }).type).toBe('table')
  })
})
