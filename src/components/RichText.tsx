import {
  RichText as LexicalRichText,
  type JSXConverters,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type {
  SerializedTableCellNode,
  SerializedUploadNode,
  SerializedTableNode,
  SerializedTableRowNode,
} from '@payloadcms/richtext-lexical'
import React from 'react'

import { lexicalPlainText } from '@/lib/readingTime'
import type { Media } from '@/payload-types'

type Props = {
  data: SerializedEditorState | null | undefined
  className?: string
}

/**
 * Blockquotes render as the design system's lime callout box —
 * post bodies use them exclusively for callouts, never as plain quotes.
 */
const calloutClasses = [
  'prose-blockquote:rounded-md',
  'prose-blockquote:border-0',
  'prose-blockquote:bg-brand-tint',
  'prose-blockquote:px-6',
  'prose-blockquote:py-5',
  'prose-blockquote:font-medium',
  'prose-blockquote:not-italic',
  'prose-blockquote:text-text-heading',
  'prose-blockquote:prose-p:my-0',
  '[&_blockquote_p:first-of-type]:before:content-none',
  '[&_blockquote_p:last-of-type]:after:content-none',
].join(' ')

/**
 * A short body cell ("12 ms", "4 096", "99.5 %", "Robopipe S") stays on one
 * line, so numbers and names never break. Longer text wraps in a wider column.
 * Header cells always wrap, so a long header does not widen its column.
 */
export function isShortCell(text: string): boolean {
  return text.trim().length <= 24
}

/**
 * A space between digit groups ("1 000", "220 000") becomes a no-break space,
 * so a wrapping cell (a header) never breaks a number in two.
 */
export function keepDigitGroups<T>(node: T): T {
  if (Array.isArray(node)) return node.map(keepDigitGroups) as T
  if (!node || typeof node !== 'object') return node
  const n = node as { type?: string; text?: unknown; children?: unknown }
  if (n.type === 'text' && typeof n.text === 'string') {
    return { ...node, text: n.text.replace(/(\d)[ \u202f](?=\d{3}(?!\d))/g, '$1\u00a0') }
  }
  if (Array.isArray(n.children)) return { ...node, children: keepDigitGroups(n.children) }
  return node
}

/** From this number of columns, a table counts as wide (see tableConverters). */
export const WIDE_TABLE_COLUMNS = 5

/** Number of columns in a Lexical table: the cells of its first row, with colSpan. */
export function tableColumnCount(node: SerializedTableNode): number {
  const firstRow = node.children?.[0] as SerializedTableRowNode | undefined
  return (firstRow?.children ?? []).reduce(
    (sum, cell) => sum + Math.max(1, (cell as SerializedTableCellNode).colSpan ?? 1),
    0,
  )
}

/**
 * Tables from the post editor (EXPERIMENTAL_TableFeature). The frame scrolls
 * sideways on its own, so a wide table never widens the page on phones.
 * From lg up, a wide table breaks out of the text column (table-breakout).
 * A table with many columns (data-wide) gets a frame as wide as its content
 * allows, so the headers wrap less, and tighter cell padding.
 */
export const tableConverters: JSXConverters<
  SerializedTableNode | SerializedTableRowNode | SerializedTableCellNode
> = {
  table: ({ node, nodesToJSX }) => {
    const wide = tableColumnCount(node) >= WIDE_TABLE_COLUMNS
    return (
      <div
        className={[
          'not-prose my-8 max-w-full overflow-x-auto rounded-md border border-border-12 lg:table-breakout',
          wide ? '[--table-frame-width:max-content]' : '',
        ].join(' ')}
        role="region"
        tabIndex={0}
        aria-label="Table"
        data-rich-table=""
        data-wide={wide ? '' : undefined}
      >
        <table className="w-full border-collapse text-left text-[15px] leading-6 text-text-90 tabular-nums">
          <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
        </table>
      </div>
    )
  },
  tablerow: ({ node, nodesToJSX }) => (
    <tr className="border-b border-border-12 last:border-b-0 even:bg-surface-3">
      {nodesToJSX({ nodes: node.children })}
    </tr>
  ),
  tablecell: ({ node, nodesToJSX }) => {
    const header = (node.headerState ?? 0) > 0
    const Tag = header ? 'th' : 'td'
    const plain = lexicalPlainText(node)
    const short = !header && isShortCell(plain)
    return (
      <Tag
        scope={header ? (node.headerState === 2 ? 'row' : 'col') : undefined}
        colSpan={node.colSpan && node.colSpan > 1 ? node.colSpan : undefined}
        rowSpan={node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined}
        className={[
          'px-4 py-2.5 align-top in-data-wide:px-3 [&_p]:m-0',
          header
            ? [
                'bg-surface-5 font-heading font-semibold text-balance text-text-heading',
                // On small screens the table scrolls anyway: a long header
                // keeps a width for two lines, not one word per line.
                plain.trim().length > 12 ? 'max-lg:min-w-[7.5rem]' : '',
              ].join(' ')
            : short
              ? 'whitespace-nowrap'
              : 'min-w-[14rem] in-data-wide:min-w-[11rem]',
        ].join(' ')}
      >
        {nodesToJSX({ nodes: keepDigitGroups(node.children) })}
      </Tag>
    )
  },
}

/**
 * An uploaded video plays inline with the browser controls, never on its own.
 * Images and other files keep the default Payload rendering.
 */
export const uploadConverter = (
  fallback: JSXConverters['upload'],
): JSXConverters<SerializedUploadNode> => ({
  upload: (args) => {
    const media = args.node.value as Media | number
    if (typeof media !== 'object' || !media?.mimeType?.startsWith('video/') || !media.url) {
      return typeof fallback === 'function' ? fallback(args) : null
    }
    const caption = (args.node.fields?.alt as string | undefined) || media.alt
    return (
      <figure className="my-8">
        <video
          className="w-full rounded-lg bg-surface-3"
          controls
          preload="metadata"
          playsInline
          src={media.url}
          aria-label={caption || undefined}
        />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    )
  },
})

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...tableConverters,
  ...uploadConverter(defaultConverters.upload),
})

export const RichText: React.FC<Props> = ({ data, className }) => {
  if (!data) return null
  return (
    <LexicalRichText
      data={data}
      converters={converters}
      className={
        className ??
        `prose max-w-none text-[17px] leading-[29px] text-text-90 prose-headings:font-heading prose-headings:text-text-heading prose-h2:text-[28px] prose-h2:leading-9 prose-a:text-brand-fg hover:prose-a:text-brand-fg-hover ${calloutClasses}`
      }
    />
  )
}
