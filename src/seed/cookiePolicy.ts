import type { Locale } from '@/i18n/routing'
import { PRIVACY_SLUGS } from '@/lib/paths'
import type { ContentBlock, Page } from '@/payload-types'

import { mdToLexical } from './lexical'
import { parseRemoteUrl, type SeoGeoClient } from './remoteClient'

/**
 * The cookie paragraph and the hosting sentence on the privacy policy page (issue #21,
 * docs/specs/21-google-measurement/architecture.md, chapter 15). `pnpm seed` writes them
 * into a new database. `pnpm seed:cookie-policy` changes an existing one.
 */

/** The YouTube player on the service pages (issue #22). No asterisks: see `mdToLexical`. */
export const YOUTUBE_PARAGRAPH: Record<Locale, string> = {
  cs: 'Videa na webu přehrává YouTube. Přehrávač se načte až po kliknutí na video a potom může ukládat data do vašeho prohlížeče.',
  en: 'YouTube plays the videos on this site. The player loads only after you click a video and may then store data in your browser.',
}

/**
 * Offline conversions for Google Ads (issue #26, architecture chapter 15). It goes right after
 * the marketing paragraph. No asterisks: see `mdToLexical`.
 */
export const AD_CONVERSION_PARAGRAPH: Record<Locale, string> = {
  cs: 'Když přijdete z naší reklamy Google Ads a dáte souhlas s marketingem, uložíme značku kliknutí do cookie rp_click na 90 dní. Když potom odešlete poptávku z firemní e-mailové adresy, předáme Googlu otisk e-mailu (SHA-256) a značku kliknutí, pokud ji máme. Google z nich zjistí, která reklama poptávku přinesla. Čitelný e-mail Googlu nepředáváme. Bez souhlasu nepředáme nic.',
  en: 'When you come from our Google Ads ad and consent to marketing, we store the click ID in the cookie rp_click for 90 days. When you then send an inquiry from a company email address, we give Google a hash of the email (SHA-256) and the click ID, if we have it. Google uses them to find out which ad brought the inquiry. We never give Google the readable email. Without consent, we give nothing.',
}

/** Replaces the old "Analytics" paragraph, which said the site sets no cookies. */
export const COOKIE_POLICY: Record<Locale, string> = {
  cs: `**Cookies a měření.** Web používá cookies jen s vaším souhlasem. Nezbytná cookie rp_consent uloží vaši volbu na 6 měsíců.

S vaším souhlasem s analytikou používáme Google Analytics. Měříme, které stránky lidé čtou a odkud přišli. Google ukládá cookies _ga a _ga_* až na 2 roky.

S vaším souhlasem s marketingem používáme značku Google Ads. Měříme výsledky reklam a ukazujeme naše reklamy na jiných webech. Google ukládá cookies _gcl_* až na 90 dní. Po kliknutí na reklamu ukládá také cookies s předponou _gac_.

${AD_CONVERSION_PARAGRAPH.cs}

Bez souhlasu Google neukládá žádné cookies. Dostává jen anonymní signály bez identifikátorů. Z nich odhaduje počet návštěv.

Data zpracovává Google Ireland Limited. Může je předat do USA podle rámce EU-US Data Privacy Framework.

${YOUTUBE_PARAGRAPH.cs}

Volbu kdykoli změníte odkazem „Nastavení cookies“ v patičce webu.`,
  en: `**Cookies and measurement.** This site uses cookies only with your consent. The necessary cookie rp_consent stores your choice for 6 months.

With your consent to analytics, we use Google Analytics. We measure which pages people read and where they came from. Google stores the cookies _ga and _ga_* for up to 2 years.

With your consent to marketing, we use the Google Ads tag. We measure ad results and show our ads on other sites. Google stores the cookies _gcl_* for up to 90 days. After a click on an ad, it also stores cookies with the prefix _gac_.

${AD_CONVERSION_PARAGRAPH.en}

Without consent, Google stores no cookies. It gets only anonymous signals without identifiers. It uses them to estimate visits.

Google Ireland Limited processes the data. It may transfer data to the USA under the EU-US Data Privacy Framework.

${YOUTUBE_PARAGRAPH.en}

You can change your choice at any time with the “Cookie settings” link in the footer.`,
}

/** Replaces the sentence that names Vercel. Waits for the owner's confirmation. */
export const HOSTING_SENTENCE: Record<Locale, string> = {
  cs: 'Web provozujeme na serverech Google Cloud v Německu (Frankfurt).',
  en: 'We run the site on Google Cloud servers in Germany (Frankfurt).',
}

/** First words of the old paragraph and of the new one, per locale. */
const OLD_LABEL: Record<Locale, string> = { cs: 'Analytika.', en: 'Analytics.' }
const NEW_LABEL: Record<Locale, string> = {
  cs: 'Cookies a měření.',
  en: 'Cookies and measurement.',
}
/** First words of the marketing paragraph. The ad conversion paragraph goes after it. */
const MARKETING_LABEL: Record<Locale, string> = {
  cs: 'S vaším souhlasem s marketingem',
  en: 'With your consent to marketing',
}
/** First words of the last cookie paragraph. The YouTube paragraph goes before it. */
const SETTINGS_LABEL: Record<Locale, string> = {
  cs: 'Volbu kdykoli změníte',
  en: 'You can change your choice',
}

/** The whole sentence up to its full stop: en has "Vercel; data is stored in the EU." */
const OLD_HOSTING = /[^.]*\bVercel\b[^.]*\./

type RichText = ContentBlock['content']
type LexicalNode = RichText['root']['children'][number] & {
  text?: string
  children?: LexicalNode[]
}

const plainText = (node: LexicalNode): string =>
  node.text ?? (node.children ?? []).map(plainText).join('')

export type CookiePolicyResult = { content: RichText; changes: string[]; missing: string[] }

/**
 * Pure part: puts the cookie paragraphs in place of the old "Analytics" paragraph and
 * swaps the Vercel sentence. Runs again without a change (idempotent).
 */
export const applyCookiePolicyToContent = (
  content: RichText,
  locale: Locale,
  cookieNodes: LexicalNode[],
): CookiePolicyResult => {
  const children = [...(content.root.children as LexicalNode[])]
  const changes: string[] = []
  const missing: string[] = []

  if (!children.some((node) => plainText(node).startsWith(NEW_LABEL[locale]))) {
    const index = children.findIndex((node) => plainText(node).startsWith(OLD_LABEL[locale]))
    if (index === -1) missing.push(`paragraph "${OLD_LABEL[locale]}"`)
    else {
      children.splice(index, 1, ...cookieNodes)
      changes.push(`paragraph "${OLD_LABEL[locale]}" → "${NEW_LABEL[locale]}"`)
    }
  } else if (!children.some((node) => plainText(node) === YOUTUBE_PARAGRAPH[locale])) {
    // A page that already has the cookie paragraphs from #21 gets only the YouTube one.
    const youtube = cookieNodes.find((node) => plainText(node) === YOUTUBE_PARAGRAPH[locale])
    const index = children.findIndex((node) => plainText(node).startsWith(SETTINGS_LABEL[locale]))
    if (!youtube || index === -1) missing.push(`paragraph "${SETTINGS_LABEL[locale]}"`)
    else {
      children.splice(index, 0, youtube)
      changes.push(`YouTube paragraph before "${SETTINGS_LABEL[locale]}"`)
    }
  }

  // A page from #21 or #22 gets the ad conversion paragraph (issue #26) after the marketing one.
  // A page that got the full cookie text above already has it.
  if (
    children.some((node) => plainText(node).startsWith(NEW_LABEL[locale])) &&
    !children.some((node) => plainText(node) === AD_CONVERSION_PARAGRAPH[locale])
  ) {
    const adConversion = cookieNodes.find(
      (node) => plainText(node) === AD_CONVERSION_PARAGRAPH[locale],
    )
    const index = children.findIndex((node) => plainText(node).startsWith(MARKETING_LABEL[locale]))
    if (!adConversion || index === -1) missing.push(`paragraph "${MARKETING_LABEL[locale]}"`)
    else {
      children.splice(index + 1, 0, adConversion)
      changes.push(`ad conversion paragraph after "${MARKETING_LABEL[locale]}"`)
    }
  }

  const replaceHosting = (node: LexicalNode): LexicalNode => {
    if (node.text !== undefined && OLD_HOSTING.test(node.text)) {
      changes.push(`hosting sentence → "${HOSTING_SENTENCE[locale]}"`)
      const text = node.text.replace(OLD_HOSTING, (match) =>
        // Keep the space before the sentence when it is not the first one.
        match.startsWith(' ') ? ` ${HOSTING_SENTENCE[locale]}` : HOSTING_SENTENCE[locale],
      )
      return { ...node, text } as LexicalNode
    }
    return node.children
      ? ({ ...node, children: node.children.map(replaceHosting) } as LexicalNode)
      : node
  }
  const updated = children.map(replaceHosting)
  const hasHosting = updated.some((node) => plainText(node).includes(HOSTING_SENTENCE[locale]))
  if (!hasHosting) missing.push('hosting sentence (no sentence with "Vercel")')

  return {
    content: {
      ...content,
      root: { ...content.root, children: updated as RichText['root']['children'] },
    },
    changes,
    missing,
  }
}

export type CookiePolicyReport = { changed: string[]; unchanged: string[]; missing: string[] }

/** Changes the published privacy page in both locales. `dryRun` only reports. */
export const applyCookiePolicy = async (
  client: SeoGeoClient,
  { dryRun }: { dryRun: boolean },
): Promise<CookiePolicyReport> => {
  const report: CookiePolicyReport = { changed: [], unchanged: [], missing: [] }

  for (const locale of ['cs', 'en'] as const) {
    const slug = PRIVACY_SLUGS[locale]
    const { docs } = await client.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale,
      depth: 0,
      limit: 1,
      draft: false,
    })
    const page = docs[0] as Page | undefined
    if (!page) {
      report.missing.push(`${locale}: page "${slug}"`)
      continue
    }

    // The seed converter, not the full markdown one: "_ga_*" must stay plain text.
    const cookieNodes = mdToLexical(COOKIE_POLICY[locale]).root.children as LexicalNode[]
    const pageChanges: string[] = []
    let contentBlocks = 0
    const layout = page.layout.map((block) => {
      if (block.blockType !== 'content') return block
      contentBlocks += 1
      const result = applyCookiePolicyToContent(block.content, locale, cookieNodes)
      pageChanges.push(...result.changes)
      report.missing.push(...result.missing.map((item) => `${locale} pages#${page.id}: ${item}`))
      return { ...block, content: result.content }
    })
    if (contentBlocks === 0) report.missing.push(`${locale} pages#${page.id}: content block`)

    const label = `${locale} pages#${page.id} (${slug})`
    if (pageChanges.length === 0) {
      report.unchanged.push(label)
      continue
    }
    report.changed.push(`${label}: ${pageChanges.join('; ')}`)
    if (dryRun) continue
    await client.update({
      collection: 'pages',
      id: page.id,
      locale,
      depth: 0,
      data: { layout, _status: 'published' },
    })
  }

  return report
}

const COOKIE_POLICY_USAGE =
  'Usage: pnpm seed:cookie-policy [--dry-run] [--production] [--remote=<URL>]'

/** Arguments of `pnpm seed:cookie-policy`. Unknown ones throw before anything runs. */
export const parseCookiePolicyArgs = (
  args: string[],
): { dryRun: boolean; production: boolean; remote?: string } => {
  const out: { dryRun: boolean; production: boolean; remote?: string } = {
    dryRun: false,
    production: false,
  }
  for (const arg of args) {
    const [name, value] = arg.split(/=(.*)/s)
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--production') out.production = true
    else if (name === '--remote' && value) out.remote = parseRemoteUrl(value).origin
    else throw new Error(`Unknown argument "${arg}". ${COOKIE_POLICY_USAGE}`)
  }
  return out
}
