import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

/**
 * Claude API calls for AI blog generation.
 *
 * Model: claude-fable-5 (user's explicit choice). Fable specifics honored here:
 * thinking is always on (no `thinking` param), and safety classifiers can decline
 * a request (stop_reason "refusal") — so every call opts into the server-side
 * fallback chain to claude-opus-4-8, which reruns the same request on a decline.
 */
const MODEL = 'claude-fable-5'
const FALLBACK_MODEL = 'claude-opus-4-8'
const FALLBACK_BETA = 'server-side-fallback-2026-06-01'

const localeArticleSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  contentMarkdown: z.string().min(1),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  ctaHeadline: z.string().min(1),
  heroAlt: z.string().min(1),
})

const englishArticleSchema = localeArticleSchema.extend({
  categorySlug: z.string().nullable(),
  pexelsQuery: z.string().min(1),
})

export type LocaleArticle = z.infer<typeof localeArticleSchema>
export type EnglishArticle = z.infer<typeof englishArticleSchema>

const LOCALE_FIELD_PROPERTIES = {
  title: { type: 'string', description: 'Final article headline (no trailing period).' },
  excerpt: {
    type: 'string',
    description: 'One- or two-sentence summary for listings and RSS (max ~200 characters).',
  },
  contentMarkdown: { type: 'string', description: 'Full article body in constrained markdown.' },
  seoTitle: { type: 'string', description: 'Meta title, max ~60 characters.' },
  seoDescription: { type: 'string', description: 'Meta description, 120–155 characters.' },
  ctaHeadline: {
    type: 'string',
    description:
      'Headline for the "Book a demo" section under the post, tying the topic to trying Robopipe, e.g. "Run the pipeline on your own products."',
  },
  heroAlt: { type: 'string', description: 'Descriptive alt text for the hero image.' },
} as const

const CONTENT_RULES = `contentMarkdown must use only this markdown subset: plain paragraphs, ## section headings, **bold**, *italic*, "- " bullet lists, "1. " numbered lists, > blockquotes (exactly one, holding the key takeaway — it renders as a highlighted callout box), and [text](url) links. No H1, no images, no tables, no code blocks, no horizontal rules.`

const getClient = (): Anthropic => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — cannot generate blog posts.')
  }
  return new Anthropic()
}

const generateJson = async (args: {
  system: string
  prompt: string
  schema: Record<string, unknown>
  webSearch?: boolean
}): Promise<unknown> => {
  const client = getClient()
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 30000,
    betas: [FALLBACK_BETA],
    fallbacks: [{ model: FALLBACK_MODEL }],
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: args.schema },
    },
    ...(args.webSearch
      ? { tools: [{ type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 4 }] }
      : {}),
    system: args.system,
    messages: [{ role: 'user', content: args.prompt }],
  })
  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    const detail = message.stop_details?.explanation ?? message.stop_details?.category ?? 'no detail'
    throw new Error(`Claude declined the request (refusal, ${detail}) — the fallback chain refused too.`)
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Claude hit the output token limit before finishing the article.')
  }

  const text = [...message.content].reverse().find((block) => block.type === 'text')?.text
  if (!text) throw new Error(`Claude returned no text output (stop_reason: ${message.stop_reason}).`)
  return JSON.parse(text)
}

const todayLine = () => `Today's date is ${new Date().toISOString().slice(0, 10)}.`

export const writeEnglishArticle = async (args: {
  basePrompt: string
  topicTitle: string
  topicDescription: string
  extraInstructions?: string | null
  /** Existing blog categories, en locale: [{ slug, title }] */
  categories: { slug: string; title: string }[]
}): Promise<EnglishArticle> => {
  const categorySlugs = args.categories.map((c) => c.slug)
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: [...Object.keys(LOCALE_FIELD_PROPERTIES), 'categorySlug', 'pexelsQuery'],
    properties: {
      ...LOCALE_FIELD_PROPERTIES,
      categorySlug:
        categorySlugs.length > 0
          ? {
              anyOf: [{ type: 'string', enum: categorySlugs }, { type: 'null' }],
              description: 'Best-matching existing blog category, or null when none fits.',
            }
          : { type: 'null', description: 'No categories exist yet — always null.' },
      // The "avoid generic catch-alls" steer matters: a query like "factory
      // production line" ranks the same handful of stock photos for every
      // article, which is how the first generated posts shared one hero image.
      pexelsQuery: {
        type: 'string',
        description:
          'A 2–4 word English stock-photo search query for a landscape hero image: a concrete, photographable subject, not an abstract concept. Make it specific to THIS article\'s subject — name the actual product, material, room or piece of equipment it discusses (e.g. "cheese wheels warehouse", "bottling line closeup", "bakery cooling rack"). Avoid generic catch-alls like "factory production line" or "industrial automation", which return the same handful of stock photos for every article.',
      },
    },
  }

  const categoriesLine = args.categories.length
    ? `Existing blog categories: ${args.categories.map((c) => `"${c.title}" (slug: ${c.slug})`).join(', ')}.`
    : 'There are no blog categories yet.'

  const result = await generateJson({
    system: `${args.basePrompt}\n\n${todayLine()}`,
    webSearch: true,
    schema,
    prompt: [
      'Write the English version of a new blog article.',
      '',
      `Topic: ${args.topicTitle}`,
      `Brief: ${args.topicDescription}`,
      ...(args.extraInstructions ? ['', `Additional instructions for this article: ${args.extraInstructions}`] : []),
      '',
      'Use web search to ground the article in current, real facts where the topic benefits from it.',
      categoriesLine,
      '',
      CONTENT_RULES,
    ].join('\n'),
  })
  return englishArticleSchema.parse(result)
}

export const writeCzechArticle = async (args: {
  basePrompt: string
  english: EnglishArticle
}): Promise<LocaleArticle> => {
  const { categorySlug: _c, pexelsQuery: _p, ...english } = args.english
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(LOCALE_FIELD_PROPERTIES),
    properties: LOCALE_FIELD_PROPERTIES,
  }

  const result = await generateJson({
    system: `${args.basePrompt}\n\n${todayLine()}`,
    schema,
    prompt: [
      'Below is the finished English version of a blog article as JSON. Write the Czech version of the same article — adapt it for Czech professional readers rather than translating word-for-word, per your instructions. Keep the same structure, facts and links.',
      '',
      JSON.stringify(english, null, 2),
      '',
      CONTENT_RULES,
    ].join('\n'),
  })
  return localeArticleSchema.parse(result)
}
