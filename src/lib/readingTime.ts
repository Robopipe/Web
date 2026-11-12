/**
 * Reading time of a Lexical rich-text value.
 *
 * Only the visible text counts: `text` nodes, including those inside table
 * cells, lists, links and quotes. Node metadata (type, format, version,
 * upload/relationship values, image alt and file names) is never counted.
 */

export const WORDS_PER_MINUTE = 220

type LexicalNode = {
  type?: string
  text?: unknown
  children?: unknown
}

// Nodes that hold data, not readable text. Their fields are never walked.
const SKIPPED_NODE_TYPES = new Set(['upload', 'relationship', 'block', 'inlineBlock'])

// Nodes that end a run of text, so words in neighbouring cells, paragraphs
// or list items never merge into one word.
const BREAK_NODE_TYPES = new Set(['linebreak', 'tab'])

function collectText(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return
  const n = node as LexicalNode
  if (n.type && SKIPPED_NODE_TYPES.has(n.type)) return
  if (n.type && BREAK_NODE_TYPES.has(n.type)) {
    out.push(' ')
    return
  }
  if (typeof n.text === 'string') out.push(n.text)
  if (Array.isArray(n.children)) {
    for (const child of n.children) collectText(child, out)
    // Each element node (paragraph, cell, list item) ends a run of text.
    out.push(' ')
  }
}

/** The visible text of a Lexical editor state, with element boundaries as spaces. */
export function lexicalPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const root = (content as { root?: unknown }).root
  const out: string[] = []
  collectText(root ?? content, out)
  return out.join('')
}

export function countWords(text: string): number {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

/** Minutes to read, at least 1. */
export function readingTimeMinutes(content: unknown): number {
  return Math.max(1, Math.round(countWords(lexicalPlainText(content)) / WORDS_PER_MINUTE))
}
