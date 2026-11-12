import { getPayload, type Payload } from 'payload'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { isShortCell, RichText } from '@/components/RichText'
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
