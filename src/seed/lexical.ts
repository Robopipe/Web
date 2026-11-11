/**
 * Lexical helpers for seed content: paragraphs, ## headings, `> [!callout]` blockquotes,
 * **bold** and *italic*. No other markdown.
 */

const BOLD = 1
const ITALIC = 2

type LexicalText = { type: 'text'; text: string; version: 1; format?: number }

/** Parse **bold** and *italic* spans into lexical text nodes. */
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

/**
 * Constrained markdown → lexical: paragraphs, ## headings, and
 * `> [!callout]` blockquotes (rendered as lime callout boxes on the site).
 */
export const mdToLexical = (md: string) => {
  const children = md
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('## ')) {
        return {
          type: 'heading',
          tag: 'h2',
          children: parseInline(trimmed.slice(3)),
          version: 1,
        }
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
    root: {
      type: 'root',
      children,
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}
