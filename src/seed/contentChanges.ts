import fs from 'node:fs'
import path from 'node:path'

import type { CollectionSlug, GlobalSlug } from 'payload'

import { parseRemoteUrl, type SeoGeoClient } from './remoteClient'

/**
 * Content change files (issue #8, architecture chapter 9). One file holds the
 * content changes of one comment. Every change carries the old value, so the
 * script writes only where the target still has that old value. Anything else
 * is a conflict, and a conflict stops the whole file before it writes.
 */

export const CHANGES_DIR = path.resolve(process.cwd(), 'seed-assets/content-changes')

type Locale = 'cs' | 'en'
const LOCALES: Locale[] = ['cs', 'en']

/** A document of a collection (by slug in the given locale, or by id) or a global. */
type Target = { collection?: string; slug?: string; id?: number; global?: string }

export type SetChange = Target & {
  op: 'set'
  locale: Locale
  path: string
  from: unknown
  to: unknown
}
export type InsertChange = Target & {
  op: 'insert'
  locale: Locale
  path: string
  /** Row id to insert after. Without it the row goes to the end. */
  after?: string
  value: { id: string } & Record<string, unknown>
}
export type RemoveChange = Target & { op: 'remove'; locale: Locale; path: string; from: unknown }
export type UploadChange = {
  op: 'upload'
  ref: string
  /** Relative to the change file. */
  file: string
  alt: Record<Locale, string>
}
export type Change = SetChange | InsertChange | RemoveChange | UploadChange
export type ChangeFile = { comment: number; changes: Change[] }

export type FileReport = { applied: string[]; skipped: string[]; conflict: string[] }

type Doc = Record<string, unknown>

/* --------------------------------- reading --------------------------------- */

const fail = (where: string, message: string): never => {
  throw new Error(`${where}: ${message}`)
}

/** Checks the shape of a change file. A wrong file stops the run before any read or write. */
export const parseChangeFile = (json: unknown, where: string): ChangeFile => {
  const file = json as ChangeFile
  if (!file || typeof file !== 'object') fail(where, 'not a JSON object')
  if (!Number.isInteger(file.comment)) fail(where, '"comment" must be the comment number')
  if (!Array.isArray(file.changes) || !file.changes.length) fail(where, '"changes" is empty')
  file.changes.forEach((change, i) => {
    const at = `${where} change ${i + 1}`
    if (change.op === 'upload') {
      if (!change.ref || !change.file) fail(at, 'upload needs "ref" and "file"')
      if (!change.alt?.cs || !change.alt?.en) fail(at, 'upload needs "alt" in cs and en')
      return
    }
    if (!['set', 'insert', 'remove'].includes(change.op)) fail(at, `unknown op "${change.op}"`)
    const target = change as Target
    if (!!target.collection === !!target.global) fail(at, 'give either "collection" or "global"')
    if (target.collection && !target.slug && target.id === undefined) {
      fail(at, 'a collection change needs "slug" or "id"')
    }
    if (!LOCALES.includes(change.locale)) fail(at, '"locale" must be cs or en')
    if (!change.path) fail(at, '"path" is missing')
    const op: string = change.op
    if (op !== 'insert' && !('from' in change)) fail(at, `${op} needs "from"`)
    if (change.op === 'set' && !('to' in change)) fail(at, 'set needs "to"')
    if (change.op === 'insert' && typeof change.value?.id !== 'string') {
      fail(at, 'insert needs "value" with a string "id"')
    }
  })
  return file
}

/** The change files to run: one given file, or every *.json in the folder by name. */
export const listChangeFiles = (dir: string, file?: string): string[] => {
  if (file) return [path.resolve(file)]
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(dir, name))
}

/* ------------------------------ path handling ------------------------------ */

/** Deep equality that ignores key order. */
export const sameValue = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if ((a ?? null) === null && (b ?? null) === null) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const other = b as unknown[]
    return a.length === other.length && a.every((v, i) => sameValue(v, other[i]))
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((k) => sameValue((a as Doc)[k], (b as Doc)[k]))
}

const isRow = (value: unknown): value is Doc =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * Follows a dotted path. A segment inside an array is the row id, not the index.
 * Returns the parent container and the key or index of the last segment.
 */
const locate = (
  doc: Doc,
  segments: string[],
): { parent: Doc | unknown[]; key: string | number } | null => {
  let current: unknown = doc
  for (let i = 0; i < segments.length - 1; i++) {
    current = step(current, segments[i])
    if (current === undefined) return null
  }
  if (Array.isArray(current)) {
    const index = current.findIndex((row) => isRow(row) && row.id === segments.at(-1))
    return index === -1 ? null : { parent: current, key: index }
  }
  return isRow(current) ? { parent: current, key: segments.at(-1)! } : null
}

const step = (value: unknown, segment: string): unknown => {
  if (Array.isArray(value)) return value.find((row) => isRow(row) && row.id === segment)
  return isRow(value) ? value[segment] : undefined
}

/** The value at a dotted path, or undefined when a row or field on the way is missing. */
export const getAt = (doc: Doc, dotted: string): unknown => {
  const spot = locate(doc, dotted.split('.'))
  if (!spot) return undefined
  return (spot.parent as Record<string | number, unknown>)[spot.key]
}

/* -------------------------------- planning --------------------------------- */

type Outcome = 'applied' | 'skipped' | 'conflict'

/**
 * Applies one change to the working copy of a document and says what it did.
 * Pure: the caller decides whether the working copy is written.
 */
export const applyChange = (
  doc: Doc,
  change: SetChange | InsertChange | RemoveChange,
  media: (ref: string) => unknown = (ref) => ({ $media: ref }),
): { outcome: Outcome; detail?: string } => {
  const segments = change.path.split('.')
  const resolve = (value: unknown): unknown =>
    isRow(value) && typeof value.$media === 'string' && Object.keys(value).length === 1
      ? media(value.$media)
      : value

  if (change.op === 'set') {
    const from = resolve(change.from)
    const to = resolve(change.to)
    const spot = locate(doc, segments)
    if (!spot) return { outcome: 'conflict', detail: `path not found` }
    const container = spot.parent as Record<string | number, unknown>
    const current = container[spot.key]
    if (sameValue(current, to)) return { outcome: 'skipped' }
    if (!sameValue(current, from)) {
      return {
        outcome: 'conflict',
        detail: `from ${JSON.stringify(from)}, now ${JSON.stringify(current)}, to ${JSON.stringify(to)}`,
      }
    }
    container[spot.key] = to
    return { outcome: 'applied' }
  }

  if (change.op === 'insert') {
    const list = getAt(doc, change.path)
    if (!Array.isArray(list)) return { outcome: 'conflict', detail: 'path is not a list' }
    if (list.some((row) => isRow(row) && row.id === change.value.id)) return { outcome: 'skipped' }
    const at = change.after
      ? list.findIndex((row) => isRow(row) && row.id === change.after) + 1
      : list.length
    if (at === 0)
      return { outcome: 'conflict', detail: `row ${change.after} to insert after not found` }
    list.splice(at, 0, change.value)
    return { outcome: 'applied' }
  }

  const parentPath = segments.slice(0, -1).join('.')
  const list = parentPath ? getAt(doc, parentPath) : undefined
  if (!Array.isArray(list)) return { outcome: 'conflict', detail: 'path is not a row of a list' }
  const index = list.findIndex((row) => isRow(row) && row.id === segments.at(-1))
  if (index === -1) return { outcome: 'skipped' }
  if (!sameValue(list[index], change.from)) {
    return {
      outcome: 'conflict',
      detail: `row is not the same as "from", now ${JSON.stringify(list[index])}`,
    }
  }
  list.splice(index, 1)
  return { outcome: 'applied' }
}

const targetName = (change: Target): string =>
  change.global
    ? `globals/${change.global}`
    : `${change.collection}/${change.slug ?? `#${change.id}`}`

export const describeChange = (change: Change): string =>
  change.op === 'upload'
    ? `upload ${change.ref} (${change.file})`
    : `${change.op} ${targetName(change)} ${change.locale} ${change.path}`

/* ------------------------------ remote access ------------------------------ */

type FindResult = { docs: Doc[] }

const loadTarget = async (
  client: SeoGeoClient,
  target: Target,
  locale: Locale,
  draft: boolean,
): Promise<Doc | null> => {
  if (target.global) {
    return (await client.findGlobal({
      slug: target.global as GlobalSlug,
      locale,
      depth: 0,
      draft,
    })) as unknown as Doc
  }
  const where = target.slug ? { slug: { equals: target.slug } } : { id: { equals: target.id } }
  const result = (await client.find({
    collection: target.collection as CollectionSlug,
    where,
    locale,
    depth: 0,
    draft,
    limit: 1,
  } as never)) as unknown as FindResult
  return result.docs[0] ?? null
}

const findMedia = async (client: SeoGeoClient, filename: string): Promise<number | null> => {
  const result = (await client.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    depth: 0,
    limit: 1,
  })) as unknown as FindResult
  return (result.docs[0]?.id as number | undefined) ?? null
}

type Group = {
  target: Target
  locale: Locale
  doc: Doc
  fields: Set<string>
}

/**
 * Runs one change file against the client. Reads everything first and writes
 * only when no change in the file is a conflict. In a dry run it never writes.
 */
export const applyChangeFile = async (
  client: SeoGeoClient,
  file: ChangeFile,
  { dryRun, baseDir }: { dryRun: boolean; baseDir: string },
): Promise<FileReport> => {
  const report: FileReport = { applied: [], skipped: [], conflict: [] }

  // Media first: an existing file with the same name is reused, so a second run uploads nothing.
  const mediaIds = new Map<string, number | null>()
  for (const change of file.changes) {
    if (change.op !== 'upload') continue
    const existing = await findMedia(client, path.basename(change.file))
    mediaIds.set(change.ref, existing)
    if (!fs.existsSync(path.resolve(baseDir, change.file))) {
      report.conflict.push(`${describeChange(change)}: file not found`)
    } else (existing ? report.skipped : report.applied).push(describeChange(change))
  }
  const media = (ref: string): unknown => {
    if (!mediaIds.has(ref)) throw new Error(`$media "${ref}" has no upload in this file`)
    return mediaIds.get(ref) ?? { $media: ref }
  }

  const groups = new Map<string, Group>()
  for (const change of file.changes) {
    if (change.op === 'upload') continue
    const key = `${targetName(change)}|${change.locale}`
    let group = groups.get(key)
    if (!group) {
      const doc = await loadTarget(client, change, change.locale, false)
      if (!doc) {
        report.conflict.push(`${describeChange(change)}: document not found`)
        continue
      }
      group = {
        target: change,
        locale: change.locale,
        doc: structuredClone(doc),
        fields: new Set(),
      }
      groups.set(key, group)
    }
    const { outcome, detail } = applyChange(group.doc, change, media)
    report[outcome].push(`${describeChange(change)}${detail ? `: ${detail}` : ''}`)
    if (outcome === 'applied') group.fields.add(change.path.split('.')[0])
  }

  // A newer draft means someone is editing the document. Publishing would publish their work.
  for (const group of groups.values()) {
    if (!group.fields.size) continue
    const draft = await loadTarget(client, group.target, group.locale, true)
    if (draft && String(draft.updatedAt) > String(group.doc.updatedAt)) {
      report.conflict.push(`${targetName(group.target)}: rozpracovaný koncept v produkci`)
    }
  }

  if (report.conflict.length || dryRun) return report

  for (const change of file.changes) {
    if (change.op !== 'upload' || mediaIds.get(change.ref)) continue
    const doc = (await client.create({
      collection: 'media',
      locale: 'cs',
      data: { alt: change.alt.cs } as never,
      filePath: path.resolve(baseDir, change.file),
    })) as unknown as Doc
    await client.update({
      collection: 'media',
      id: doc.id as number,
      locale: 'en',
      data: { alt: change.alt.en } as never,
    })
    mediaIds.set(change.ref, doc.id as number)
  }

  for (const group of groups.values()) {
    if (!group.fields.size) continue
    // Uploads are done now, so every { $media } placeholder gets its real ID.
    const data: Doc = {}
    for (const field of group.fields) data[field] = resolveMedia(group.doc[field], media)
    if ('_status' in group.doc) data._status = 'published'
    if (group.target.global) {
      await client.updateGlobal({
        slug: group.target.global as GlobalSlug,
        locale: group.locale,
        data: data as never,
      })
    } else {
      await client.update({
        collection: group.target.collection as CollectionSlug,
        id: group.doc.id as number,
        locale: group.locale,
        data: data as never,
      })
    }
  }
  return report
}

const resolveMedia = (value: unknown, media: (ref: string) => unknown): unknown => {
  if (Array.isArray(value)) return value.map((v) => resolveMedia(v, media))
  if (!isRow(value)) return value
  if (typeof value.$media === 'string' && Object.keys(value).length === 1)
    return media(value.$media)
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveMedia(v, media)]))
}

/* ------------------------------- command line ------------------------------ */

export type ContentArgs = { remote: string; dryRun: boolean; file?: string }

export const CONTENT_USAGE = 'Usage: pnpm content:apply --remote=<URL> [--dry-run] [--file=<path>]'

/**
 * Reads the command line of content:apply. --remote is required, so the target is
 * always named. Any unknown argument stops the run before it logs in or writes.
 */
export const parseContentArgs = (args: string[]): ContentArgs => {
  const out: Partial<ContentArgs> = { dryRun: false }
  const seen = new Set<string>()
  const stop = (message: string): never => {
    throw new Error(`${message}\n${CONTENT_USAGE}`)
  }
  for (const arg of args) {
    const [name, ...rest] = arg.split('=')
    const value = rest.length ? rest.join('=') : undefined
    if (seen.has(name)) stop(`${name} is given twice.`)
    seen.add(name)
    switch (name) {
      case '--dry-run':
        if (value !== undefined) stop(`--dry-run takes no value, not "${arg}".`)
        out.dryRun = true
        break
      case '--remote':
        if (!value) stop(`--remote needs a URL: --remote=http://127.0.0.1:3810, not "${arg}".`)
        parseRemoteUrl(value!)
        out.remote = value
        break
      case '--file':
        if (!value) stop(`--file needs a path, not "${arg}".`)
        out.file = value
        break
      default:
        stop(`Unknown argument "${arg}".`)
    }
  }
  if (!out.remote) stop('--remote is required.')
  return out as ContentArgs
}
