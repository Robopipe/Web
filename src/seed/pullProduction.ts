import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-postgres'
import type { CollectionSlug, GlobalSlug, Payload } from 'payload'

import { parseRemoteUrl, type SeoGeoClient } from './remoteClient'

/**
 * Copy of the production content into an empty local database (issue #8).
 * Reads production anonymously through REST, so it sees what a visitor sees:
 * published documents only. Keeps the production IDs (needs allowIDOnCreate).
 */

/** Order matters: every collection only points at collections before it. Pages point at pages. */
export const PULL_COLLECTIONS = [
  'media',
  'categories',
  'authors',
  'faqs',
  'testimonials',
  'case-studies',
  'posts',
  'pages',
  'redirects',
] as const satisfies readonly CollectionSlug[]

export const PULL_GLOBALS = ['header', 'footer', 'site-settings'] as const satisfies readonly GlobalSlug[]

const LOCALES = ['cs', 'en'] as const
const PAGE_SIZE = 100

/** Placeholder URL of an internal page link until the second pass writes the real page. */
export const PENDING_LINK = '#pull-pending'

export const PULL_USAGE = 'Usage: pnpm pull:prod --from=<URL>'

/** Reads the command line of pull:prod. Any unknown argument stops the run. */
export const parsePullArgs = (args: string[]): { from: string } => {
  const fail = (message: string): never => {
    throw new Error(`${message}\n${PULL_USAGE}`)
  }
  let from: string | undefined
  for (const arg of args) {
    const [name, ...rest] = arg.split('=')
    const value = rest.join('=')
    if (name !== '--from') fail(`Unknown argument "${arg}".`)
    if (from !== undefined) fail('--from is given twice.')
    if (!value) fail(`--from needs a URL: --from=https://robopipe.io, not "${arg}".`)
    parseRemoteUrl(value)
    from = value
  }
  if (!from) fail('--from is required.')
  return { from: from! }
}

type Doc = Record<string, unknown>

/** Fields that Payload sets itself. Media also loses the file fields: the upload makes them again. */
const META = ['createdAt', 'updatedAt']
const MEDIA_FILE = ['url', 'thumbnailURL', 'filename', 'filesize', 'width', 'height', 'mimeType', 'sizes']

export const stripMeta = (doc: Doc, collection: string): Doc => {
  const drop = new Set(collection === 'media' ? [...META, ...MEDIA_FILE] : META)
  return Object.fromEntries(Object.entries(doc).filter(([key]) => !drop.has(key)))
}

const isLink = (value: Doc): boolean => value.type === 'internal' && 'page' in value

/**
 * First pass of pages: an internal link may point at a page that does not exist yet.
 * Each link becomes an external placeholder. The second pass writes the original.
 */
export const deferPageLinks = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(deferPageLinks)
  if (!value || typeof value !== 'object') return value
  const doc = value as Doc
  const out = Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, deferPageLinks(v)]))
  return isLink(doc) ? { ...out, type: 'external', page: null, url: PENDING_LINK } : out
}

/**
 * Second pass of pages: the original links. `url` is set to null on purpose, so the
 * placeholder does not stay in the locale (anonymous reads leave out empty fields).
 */
export const restorePageLinks = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(restorePageLinks)
  if (!value || typeof value !== 'object') return value
  const doc = value as Doc
  const out = Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, restorePageLinks(v)]))
  return isLink(doc) ? { ...out, url: doc.url ?? null } : out
}

/** All documents of one collection in one locale, without fallback to the other locale. */
export const readAll = async (
  source: SeoGeoClient,
  collection: string,
  locale: string,
): Promise<Doc[]> => {
  const docs: Doc[] = []
  for (let page = 1; ; page++) {
    const result = (await source.find({
      collection: collection as CollectionSlug,
      locale: locale as 'cs',
      fallbackLocale: false,
      depth: 0,
      limit: PAGE_SIZE,
      page,
    } as never)) as unknown as { docs: Doc[]; hasNextPage?: boolean }
    docs.push(...result.docs)
    if (!result.hasNextPage) return docs
  }
}

type Size = { url?: string | null; width?: number | null }

/**
 * The original file, or the largest stored size when the original is missing in
 * the bucket (production media 34 on 11. 11. 2026). Saved under the original name.
 */
export const downloadCandidates = (doc: Doc): string[] => {
  const sizes = Object.values((doc.sizes ?? {}) as Record<string, Size>)
    .filter((size) => size.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return [doc.url as string, ...sizes.map((size) => size.url as string)].filter(Boolean)
}

const download = async (
  doc: Doc,
  dir: string,
  log: (line: string) => void,
): Promise<string> => {
  const file = path.join(dir, path.basename(doc.filename as string))
  const failed: string[] = []
  for (const url of downloadCandidates(doc)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) {
      failed.push(`${url} → ${response.status}`)
      continue
    }
    fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()))
    if (failed.length) log(`media ${doc.id}: original missing, used ${url}`)
    return file
  }
  throw new Error(`media ${doc.id}: no file to download (${failed.join(', ')})`)
}

export type PullReport = Record<string, number>

const CONTEXT = { skipRevalidate: true }

/**
 * Copies production into the local Payload. Stops before any write when the
 * local database already has pages or media: the copy needs an empty database.
 */
export const pullProduction = async (
  payload: Payload,
  source: SeoGeoClient,
  log: (line: string) => void = () => {},
): Promise<PullReport> => {
  for (const collection of ['pages', 'media'] as const) {
    const { totalDocs } = await payload.count({ collection })
    if (totalDocs > 0) {
      throw new Error(
        `The local database already has ${totalDocs} ${collection}. pull:prod needs an empty database (bin/refresh-local.sh makes one).`,
      )
    }
  }

  const report: PullReport = {}
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pull-prod-'))
  const pages: { id: number | string; cs: Doc; en?: Doc }[] = []
  try {
    for (const collection of PULL_COLLECTIONS) {
      const cs = await readAll(source, collection, 'cs')
      const en = new Map((await readAll(source, collection, 'en')).map((d) => [d.id, d]))
      for (const doc of cs) {
        const id = doc.id as number
        const enDoc = en.get(id)
        const data = { cs: stripMeta(doc, collection), en: enDoc && stripMeta(enDoc, collection) }
        // Some production media miss the alt (a required field) in one locale. Alt is the
        // only localized media field, so that locale is not written and falls back.
        const locales = LOCALES.filter((l) => data[l] && (collection !== 'media' || data[l].alt))
        if (!locales.length) throw new Error(`${collection} ${id}: no locale with the required fields`)
        if (collection === 'pages') pages.push({ id, ...data })
        const [first, ...rest] = locales
        await payload.create({
          collection,
          data: (collection === 'pages' ? deferPageLinks(data[first]) : data[first]) as never,
          locale: first,
          draft: false,
          filePath: collection === 'media' ? await download(doc, tmp, log) : undefined,
          context: CONTEXT,
        })
        // Pages get every locale in the second pass.
        for (const locale of collection === 'pages' ? [] : rest) {
          await payload.update({
            collection,
            id,
            data: data[locale] as never,
            locale,
            draft: false,
            context: CONTEXT,
          })
        }
      }
      report[collection] = cs.length
      log(`${collection}: ${cs.length}`)
    }

    // Second pass: every page exists now, so internal links can point at it.
    for (const page of pages) {
      for (const locale of LOCALES) {
        const data = page[locale]
        if (!data) continue
        await payload.update({
          collection: 'pages',
          id: page.id,
          data: restorePageLinks(data) as never,
          locale,
          draft: false,
          context: CONTEXT,
        })
      }
    }

    for (const slug of PULL_GLOBALS) {
      for (const locale of LOCALES) {
        const doc = (await source.findGlobal({
          slug,
          locale,
          fallbackLocale: false,
          depth: 0,
        } as never)) as unknown as Doc
        await payload.updateGlobal({
          slug,
          data: stripMeta(doc, slug) as never,
          locale,
          context: CONTEXT,
        })
      }
      report[slug] = 1
      log(`${slug}: 1`)
    }

    await resetSequences(payload)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
  return report
}

/** Sets every id sequence to max(id), so the next local document does not reuse a copied ID. */
const resetSequences = async (payload: Payload): Promise<void> => {
  const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } })
    .drizzle
  await db.execute(sql`
    DO $$
    DECLARE t record;
    BEGIN
      FOR t IN
        SELECT c.relname AS name, pg_get_serial_sequence(quote_ident(c.relname), 'id') AS seq
        FROM pg_class c
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'id'
        WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
      LOOP
        IF t.seq IS NOT NULL THEN
          EXECUTE format(
            'SELECT setval(%L, COALESCE((SELECT max(id) FROM %I), 1), (SELECT max(id) FROM %I) IS NOT NULL)',
            t.seq, t.name, t.name
          );
        END IF;
      END LOOP;
    END $$;
  `)
}
