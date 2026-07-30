import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { SanitizedConfig } from 'payload'

import type { Post } from '@/payload-types'

let editorConfigPromise: ReturnType<typeof editorConfigFactory.default> | null = null

/**
 * Convert Claude's markdown article body into the site's Lexical editor state,
 * using the same default lexical feature set as the Posts content field
 * (headings, lists, links, blockquotes → lime callouts).
 */
export const markdownToLexical = async (
  config: SanitizedConfig,
  markdown: string,
): Promise<Post['content']> => {
  editorConfigPromise ??= editorConfigFactory.default({ config })
  const editorConfig = await editorConfigPromise
  return convertMarkdownToLexical({ editorConfig, markdown }) as Post['content']
}
