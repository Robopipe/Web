import { describe, expect, it } from 'vitest'

import type { ContentBlock } from '@/payload-types'
import {
  AD_CONVERSION_PARAGRAPH,
  COOKIE_POLICY,
  HOSTING_SENTENCE,
  YOUTUBE_PARAGRAPH,
  applyCookiePolicyToContent,
  parseCookiePolicyArgs,
} from '@/seed/cookiePolicy'
import { mdToLexical } from '@/seed/lexical'

type RichText = ContentBlock['content']
type Node = { text?: string; children?: Node[] }

const OLD_CS = `## Jaké údaje zpracováváme

**Newsletter.** Pokud se přihlásíte k odběru, uchováváme vaši e-mailovou adresu.

**Analytika.** Používáme analytiku bez cookies, která ukládá pouze agregované statistiky návštěvnosti.

## Kdo údaje zpracovává

Web provozujeme na platformě Vercel a data ukládáme v EU. E-maily odesíláme přes službu Resend.`

const OLD_EN = `**Analytics.** We use cookieless analytics.

The site runs on Vercel; data is stored in the EU. Emails are delivered via Resend.`

const text = (node: Node): string => node.text ?? (node.children ?? []).map(text).join('')
const paragraphs = (content: RichText) => (content.root.children as Node[]).map(text)
const cookieNodes = (locale: 'cs' | 'en') =>
  mdToLexical(COOKIE_POLICY[locale]).root.children as RichText['root']['children']

describe('applyCookiePolicyToContent', () => {
  it('replaces the analytics paragraph and the Vercel sentence (cs)', () => {
    const before = mdToLexical(OLD_CS) as RichText
    const { content, changes, missing } = applyCookiePolicyToContent(
      before,
      'cs',
      cookieNodes('cs'),
    )

    const after = paragraphs(content)
    expect(missing).toEqual([])
    expect(changes).toHaveLength(2)
    expect(after.some((p) => p.startsWith('Analytika.'))).toBe(false)
    expect(after.filter((p) => p.includes('Vercel'))).toEqual([])
    // The cookie text sits where the old paragraph was: after the newsletter, before the heading.
    const start = after.findIndex((p) => p.startsWith('Cookies a měření.'))
    expect(after[start - 1]).toMatch(/^Newsletter\./)
    expect(after[start + 8]).toBe('Kdo údaje zpracovává')
    expect(after[start + 6]).toBe(YOUTUBE_PARAGRAPH.cs)
    expect(after[start + 3]).toBe(AD_CONVERSION_PARAGRAPH.cs)
    expect(after).toContain(`${HOSTING_SENTENCE.cs} E-maily odesíláme přes službu Resend.`)
    expect(after.join('\n')).toContain('_ga a _ga_* až na 2 roky')
  })

  it('swaps the sentence, not the rest of the paragraph (en)', () => {
    const before = mdToLexical(OLD_EN) as RichText
    const { content, missing } = applyCookiePolicyToContent(before, 'en', cookieNodes('en'))
    expect(missing).toEqual([])
    expect(paragraphs(content)).toContain(`${HOSTING_SENTENCE.en} Emails are delivered via Resend.`)
  })

  it('changes nothing on a second run', () => {
    const once = applyCookiePolicyToContent(
      mdToLexical(OLD_CS) as RichText,
      'cs',
      cookieNodes('cs'),
    )
    const twice = applyCookiePolicyToContent(once.content, 'cs', cookieNodes('cs'))
    expect(twice.changes).toEqual([])
    expect(twice.missing).toEqual([])
    expect(twice.content).toEqual(once.content)
  })

  it('adds the YouTube and ad conversion paragraphs to the cookie text from #21 (en)', () => {
    const issue21 = COOKIE_POLICY.en
      .replace(`${YOUTUBE_PARAGRAPH.en}\n\n`, '')
      .replace(`${AD_CONVERSION_PARAGRAPH.en}\n\n`, '')
    const before = mdToLexical(
      `${issue21}\n\n${HOSTING_SENTENCE.en} Emails are delivered via Resend.`,
    ) as RichText
    const { content, changes, missing } = applyCookiePolicyToContent(
      before,
      'en',
      cookieNodes('en'),
    )
    expect(missing).toEqual([])
    expect(changes).toEqual([
      'YouTube paragraph before "You can change your choice"',
      'ad conversion paragraph after "With your consent to marketing"',
    ])
    const after = paragraphs(content)
    expect(after).toHaveLength(paragraphs(before).length + 2)
    const index = after.indexOf(YOUTUBE_PARAGRAPH.en)
    expect(after[index + 1]).toMatch(/^You can change your choice/)
    // Plain text: no italic or bold node in the new paragraph.
    const node = (content.root.children as { children?: { format?: number }[] }[])[index]
    expect(node.children?.every((child) => !child.format)).toBe(true)
    const twice = applyCookiePolicyToContent(content, 'en', cookieNodes('en'))
    expect(twice.changes).toEqual([])
  })

  it('adds only the ad conversion paragraph to the page from #22, after marketing (cs, en)', () => {
    for (const locale of ['cs', 'en'] as const) {
      const issue22 = COOKIE_POLICY[locale].replace(`${AD_CONVERSION_PARAGRAPH[locale]}\n\n`, '')
      const before = mdToLexical(`${issue22}\n\n${HOSTING_SENTENCE[locale]} Resend.`) as RichText
      const { content, changes, missing } = applyCookiePolicyToContent(
        before,
        locale,
        cookieNodes(locale),
      )
      expect(missing).toEqual([])
      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatch(/^ad conversion paragraph after/)
      const after = paragraphs(content)
      expect(after).toHaveLength(paragraphs(before).length + 1)
      const index = after.indexOf(AD_CONVERSION_PARAGRAPH[locale])
      expect(after[index - 1]).toMatch(
        /^(S vaším souhlasem s marketingem|With your consent to marketing)/,
      )
      const node = (content.root.children as { children?: { format?: number }[] }[])[index]
      expect(node.children?.every((child) => !child.format)).toBe(true)
      const twice = applyCookiePolicyToContent(content, locale, cookieNodes(locale))
      expect(twice.changes).toEqual([])
      expect(twice.content).toEqual(content)
    }
  })

  it('keeps the ad conversion text free of asterisks, and new databases get it (cs, en)', () => {
    for (const locale of ['cs', 'en'] as const) {
      expect(AD_CONVERSION_PARAGRAPH[locale]).not.toContain('*')
      expect(paragraphs(mdToLexical(COOKIE_POLICY[locale]) as RichText)).toContain(
        AD_CONVERSION_PARAGRAPH[locale],
      )
    }
  })

  it('reports what it cannot find and changes nothing else', () => {
    const before = mdToLexical('Some other text.') as RichText
    const { content, changes, missing } = applyCookiePolicyToContent(
      before,
      'en',
      cookieNodes('en'),
    )
    expect(changes).toEqual([])
    expect(missing).toHaveLength(2)
    expect(content).toEqual(before)
  })
})

describe('parseCookiePolicyArgs', () => {
  it('reads the known flags', () => {
    expect(parseCookiePolicyArgs([])).toEqual({ dryRun: false, production: false })
    expect(
      parseCookiePolicyArgs(['--dry-run', '--production', '--remote=https://robopipe.io/admin']),
    ).toEqual({ dryRun: true, production: true, remote: 'https://robopipe.io' })
  })

  it('rejects unknown arguments and a bad URL', () => {
    expect(() => parseCookiePolicyArgs(['--status=published'])).toThrow(/Unknown argument/)
    expect(() => parseCookiePolicyArgs(['--remote'])).toThrow(/Unknown argument/)
    expect(() => parseCookiePolicyArgs(['--remote=ftp://x'])).toThrow(/http or https/)
  })
})
