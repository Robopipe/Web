import {
  RichText as LexicalRichText,
  type JSXConverters,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type {
  SerializedTableCellNode,
  SerializedTableNode,
  SerializedTableRowNode,
} from '@payloadcms/richtext-lexical'
import React from 'react'

import { lexicalPlainText } from '@/lib/readingTime'

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
 * A short cell ("12 ms", "4 096", "99.5 %", "Robopipe S") stays on one line,
 * so numbers and names never break. Longer text wraps in a wider column.
 */
export function isShortCell(text: string): boolean {
  return text.trim().length <= 24
}

/**
 * Tables from the post editor (EXPERIMENTAL_TableFeature). The frame scrolls
 * sideways on its own, so a wide table never widens the page on phones.
 * From lg up, a wide table breaks out of the text column (table-breakout).
 */
export const tableConverters: JSXConverters<
  SerializedTableNode | SerializedTableRowNode | SerializedTableCellNode
> = {
  table: ({ node, nodesToJSX }) => (
    <div
      className="not-prose my-8 max-w-full overflow-x-auto rounded-md border border-border-12 lg:table-breakout"
      role="region"
      tabIndex={0}
      aria-label="Table"
      data-rich-table=""
    >
      <table className="w-full border-collapse text-left text-[15px] leading-6 text-text-90 tabular-nums">
        <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
      </table>
    </div>
  ),
  tablerow: ({ node, nodesToJSX }) => (
    <tr className="border-b border-border-12 last:border-b-0 even:bg-surface-3">
      {nodesToJSX({ nodes: node.children })}
    </tr>
  ),
  tablecell: ({ node, nodesToJSX }) => {
    const header = (node.headerState ?? 0) > 0
    const Tag = header ? 'th' : 'td'
    const short = isShortCell(lexicalPlainText(node))
    return (
      <Tag
        scope={header ? (node.headerState === 2 ? 'row' : 'col') : undefined}
        colSpan={node.colSpan && node.colSpan > 1 ? node.colSpan : undefined}
        rowSpan={node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined}
        className={[
          'px-4 py-2.5 align-top [&_p]:m-0',
          header ? 'bg-surface-5 font-heading font-semibold text-text-heading' : '',
          short ? 'whitespace-nowrap' : 'min-w-[14rem]',
        ].join(' ')}
      >
        {nodesToJSX({ nodes: node.children })}
      </Tag>
    )
  },
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...tableConverters,
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
