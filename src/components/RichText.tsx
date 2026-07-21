import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import React from 'react'

type Props = {
  data: SerializedEditorState | null | undefined
  className?: string
}

export const RichText: React.FC<Props> = ({ data, className }) => {
  if (!data) return null
  return (
    <LexicalRichText
      data={data}
      className={
        className ??
        'prose prose-slate max-w-none prose-headings:font-heading prose-a:text-brand-700'
      }
    />
  )
}
