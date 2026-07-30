import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import React from 'react'

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

export const RichText: React.FC<Props> = ({ data, className }) => {
  if (!data) return null
  return (
    <LexicalRichText
      data={data}
      className={
        className ??
        `prose max-w-none text-[17px] leading-[29px] text-text-90 prose-headings:font-heading prose-headings:text-text-heading prose-h2:text-[28px] prose-h2:leading-9 prose-a:text-brand-fg hover:prose-a:text-brand-fg-hover ${calloutClasses}`
      }
    />
  )
}
