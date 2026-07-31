import 'dotenv/config'

import config from '@payload-config'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'

import { CS_COPY_FIXES, CS_COPY_FIXES_DB_ONLY, EN_COPY_FIXES, MEDIA_ALT_CS } from './csCopyFixes'

/**
 * One-off (idempotent) copy pass, 2026-07-31: applies csCopyFixes.ts to an
 * existing database — the same edits the current seed produces on a fresh one.
 * Matches exact full strings anywhere in each document (including lexical
 * text nodes), regenerates the Czech blog-post bodies from
 * seed-assets/copy/post-*.cs.md, translates media alt texts for the cs locale
 * (moving the English originals to en) and renames the cs "Engineering"
 * category to "Technologie".
 *
 * Run with: pnpm tsx src/seed/updateCsCopy.ts   (DATABASE_URL selects the target)
 */

/* ------------------------- lexical (copy of seed helpers) ------------------------- */

const BOLD = 1
const ITALIC = 2

type LexicalText = { type: 'text'; text: string; version: 1; format?: number }

const parseInline = (text: string): LexicalText[] => {
  const nodes: LexicalText[] = []
  for (const part of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push({ type: 'text', text: part.slice(2, -2), version: 1, format: BOLD })
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push({ type: 'text', text: part.slice(1, -1), version: 1, format: ITALIC })
    } else {
      nodes.push({ type: 'text', text: part, version: 1 })
    }
  }
  return nodes
}

const mdToLexical = (md: string) => {
  const children = md
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('## ')) {
        return { type: 'heading', tag: 'h2', children: parseInline(trimmed.slice(3)), version: 1 }
      }
      if (trimmed.startsWith('>')) {
        const text = trimmed
          .split('\n')
          .map((line) => line.replace(/^>\s?/, ''))
          .filter((line) => line.trim() !== '[!callout]')
          .join(' ')
          .trim()
        return { type: 'quote', children: parseInline(text), version: 1 }
      }
      return { type: 'paragraph', children: parseInline(trimmed), version: 1 }
    })

  return {
    root: { type: 'root', children, direction: null, format: '' as const, indent: 0, version: 1 },
  }
}

/* --------------------------------- deep replace --------------------------------- */

const used = new Map<string, number>()

const makeDict = (pairs: [string, string][]): Map<string, string> => {
  const dict = new Map<string, string>()
  for (const [from, to] of pairs) {
    if (dict.has(from)) throw new Error(`Duplicate fix key: ${from}`)
    dict.set(from, to)
  }
  return dict
}

/** Replace exact full-string matches anywhere in the value. Returns a copy. */
const applyDict = (value: unknown, dict: Map<string, string>): { value: unknown; count: number } => {
  let count = 0
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const to = dict.get(v)
      if (to !== undefined) {
        count += 1
        used.set(v, (used.get(v) ?? 0) + 1)
        return to
      }
      return v
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, walk(val)]))
    }
    return v
  }
  return { value: walk(value), count }
}

/* ----------------------------------- updates ------------------------------------ */

const CS = makeDict([...CS_COPY_FIXES, ...CS_COPY_FIXES_DB_ONLY])
const EN = makeDict(EN_COPY_FIXES)

/** cs slug → markdown base name in seed-assets/copy */
const POST_MD: Record<string, string> = {
  'od-snimku-k-inferenci': 'capture-to-inference',
  'snizte-zmetkovitost': 'cut-reject-rates',
  'zive-skore-kvality': 'live-quality-score',
  'automaticke-tagovani-produktu': 'automated-product-tagging',
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config })
  const log = (msg: string) => payload.logger.info(msg)

  const updateCollection = async (
    collection: 'pages' | 'faqs' | 'testimonials' | 'case-studies' | 'posts' | 'categories',
    fields: string[],
    opts: { locale: 'cs' | 'en'; dict: Map<string, string>; versioned?: boolean },
  ) => {
    const { docs } = await payload.find({
      collection,
      locale: opts.locale,
      depth: 0,
      limit: 200,
      draft: false,
    })
    for (const doc of docs) {
      const record = doc as unknown as Record<string, unknown>
      const picked = Object.fromEntries(
        fields.filter((f) => record[f] !== undefined).map((f) => [f, record[f]]),
      )
      const { value, count } = applyDict(picked, opts.dict)
      if (count === 0) continue
      await payload.update({
        collection,
        id: doc.id,
        locale: opts.locale,
        depth: 0,
        data: {
          ...(value as Record<string, unknown>),
          ...(opts.versioned ? { _status: 'published' } : {}),
        },
      })
      log(`${collection}#${doc.id} (${opts.locale}): ${count} string(s) replaced`)
    }
  }

  // --- Collections, cs locale ---
  await updateCollection('pages', ['title', 'layout', 'seo'], { locale: 'cs', dict: CS, versioned: true })
  await updateCollection('faqs', ['question', 'answer'], { locale: 'cs', dict: CS })
  await updateCollection('testimonials', ['quote', 'personRole'], { locale: 'cs', dict: CS })
  await updateCollection('case-studies', ['title', 'excerpt', 'metrics'], { locale: 'cs', dict: CS, versioned: true })
  await updateCollection('posts', ['title', 'excerpt', 'ctaHeadline', 'seo'], { locale: 'cs', dict: CS, versioned: true })

  // --- Pages, en locale (privacy hosting fix + mirrored copy rounds) ---
  await updateCollection('pages', ['title', 'layout', 'seo'], { locale: 'en', dict: EN, versioned: true })

  // --- Blog post bodies (cs) regenerated from the updated markdown ---
  const { docs: posts } = await payload.find({ collection: 'posts', locale: 'cs', depth: 0, limit: 50, draft: false })
  for (const post of posts) {
    const base = POST_MD[post.slug ?? '']
    if (!base) {
      log(`posts#${post.id}: no seed markdown for slug "${post.slug}" — content left as is`)
      continue
    }
    const md = fs.readFileSync(path.resolve(process.cwd(), 'seed-assets', 'copy', `post-${base}.cs.md`), 'utf8')
    await payload.update({
      collection: 'posts',
      id: post.id,
      locale: 'cs',
      depth: 0,
      data: { content: mdToLexical(md), _status: 'published' },
    })
    log(`posts#${post.id} (cs): content regenerated from post-${base}.cs.md`)
  }

  // --- Category "Engineering" → "Technologie" (cs display title only) ---
  const { docs: categories } = await payload.find({
    collection: 'categories',
    locale: 'cs',
    depth: 0,
    where: { slug: { equals: 'engineering' } },
  })
  for (const cat of categories) {
    if (cat.title === 'Technologie') continue
    await payload.update({ collection: 'categories', id: cat.id, locale: 'cs', data: { title: 'Technologie' } })
    log(`categories#${cat.id} (cs): "${cat.title}" → "Technologie"`)
  }

  // --- Media alt texts: Czech to cs, original English to en ---
  const { docs: media } = await payload.find({ collection: 'media', locale: 'cs', depth: 0, limit: 200 })
  for (const doc of media) {
    const base = (doc.filename ?? '').replace(/-\d+(\.[a-z0-9]+)$/i, '$1')
    const czech = MEDIA_ALT_CS[base]
    if (!czech) {
      log(`media#${doc.id} (${doc.filename}): not a seeded file — skipped`)
      continue
    }
    const enDoc = await payload.findByID({
      collection: 'media',
      id: doc.id,
      locale: 'en',
      fallbackLocale: false,
      depth: 0,
    })
    if (!enDoc.alt) {
      const english = doc.alt !== czech ? doc.alt : czech
      await payload.update({ collection: 'media', id: doc.id, locale: 'en', data: { alt: english } })
      log(`media#${doc.id} (en): alt set to "${english}"`)
    }
    if (doc.alt !== czech) {
      await payload.update({ collection: 'media', id: doc.id, locale: 'cs', data: { alt: czech } })
      log(`media#${doc.id} (cs): alt "${doc.alt}" → "${czech}"`)
    }
  }

  // --- Globals (cs + en) ---
  for (const [locale, dict] of [['cs', CS], ['en', EN]] as const) {
    for (const slug of ['header', 'footer', 'site-settings'] as const) {
      const globalDoc = await payload.findGlobal({ slug, locale, depth: 0 })
      const { id: _id, globalType: _g, createdAt: _c, updatedAt: _u, ...data } = globalDoc as unknown as Record<string, unknown>
      const { value, count } = applyDict(data, dict)
      if (count === 0) continue
      await payload.updateGlobal({ slug, locale, data: value as Record<string, unknown> })
      log(`global ${slug} (${locale}): ${count} string(s) replaced`)
    }
  }

  // --- Staleness report: pairs that matched nothing anywhere ---
  const unused = [...CS.keys(), ...EN.keys()].filter((k) => !used.has(k))
  if (unused.length) {
    log(`NOTE: ${unused.length} fix(es) matched no document (already applied or drifted):`)
    for (const key of unused) log(`  · ${key.slice(0, 80)}${key.length > 80 ? '…' : ''}`)
  } else {
    log('All fixes matched at least one document.')
  }

  process.exit(0)
}

void run()
