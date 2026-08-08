import type { Payload, WorkflowConfig } from 'payload'

import { SERVER_URL } from '@/lib/paths'

import { writeCzechArticle, writeEnglishArticle, type EnglishArticle, type LocaleArticle } from './claude'
import { markdownToLexical } from './markdown'
import { fetchHeroImage } from './pexels'

/**
 * Generates a bilingual (en + cs) draft blog post from a blog-topics record.
 *
 * Queued by the BlogTopics afterChange hook, executed when Vercel Cron hits
 * /api/payload-jobs/run (nightly). Split into inline tasks so that a timeout or
 * failure resumes at the failed step on the next run instead of redoing the
 * expensive Claude calls — important on Vercel Hobby's function duration cap.
 *
 * Publishing stays manual: the post is created as a draft only; an editor
 * reviews it in the admin and clicks Publish.
 */

/**
 * A payload-job stuck at processing: true whose row hasn't been touched for
 * this long is a zombie — the serverless function running it was killed
 * (maxDuration, deploy) before it could clear the flag. Runs live at most
 * 300 s (route maxDuration) and every inline-task completion touches the row.
 */
export const STALE_JOB_MS = 10 * 60 * 1000

const seoDescription = (value: string) => value.slice(0, 300)

const notify = async (payload: Payload, to: string | null | undefined, subject: string, html: string) => {
  if (!to) return
  try {
    await payload.sendEmail({ to, subject, html })
  } catch (err) {
    payload.logger.error({ err }, 'Blog AI notification email failed')
  }
}

export const generateBlogPost: WorkflowConfig = {
  slug: 'generate-blog-post',
  inputSchema: [{ name: 'topicId', type: 'number', required: true }],
  retries: 1,
  handler: async ({ job, inlineTask, req }) => {
    const { payload } = req
    const topicId = (job.input as { topicId: number }).topicId

    const topic = await payload.findByID({ collection: 'blog-topics', id: topicId })
    const settings = await payload.findGlobal({ slug: 'blog-ai' })

    try {
      await payload.update({
        collection: 'blog-topics',
        id: topicId,
        data: { status: 'generating', error: null },
      })

      const en = (await inlineTask('write-en', {
        task: async ({ req }) => {
          const categories = await req.payload.find({
            collection: 'categories',
            locale: 'en',
            limit: 100,
            depth: 0,
          })
          const article = await writeEnglishArticle({
            basePrompt: settings.basePrompt,
            topicTitle: topic.title,
            topicDescription: topic.description,
            extraInstructions: topic.extraInstructions,
            categories: categories.docs
              .filter((c) => typeof c.slug === 'string' && c.slug.length)
              .map((c) => ({ slug: c.slug as string, title: c.title })),
          })
          return { output: article }
        },
      })) as EnglishArticle

      const cs = (await inlineTask('write-cs', {
        task: async () => ({
          output: await writeCzechArticle({ basePrompt: settings.basePrompt, english: en }),
        }),
      })) as LocaleArticle

      const { mediaId } = await inlineTask('hero-image', {
        task: async ({ req }) => {
          let id: number | null = null
          try {
            id = await fetchHeroImage({
              payload: req.payload,
              query: en.pexelsQuery,
              altEn: en.heroAlt,
              altCs: cs.heroAlt,
              topicId,
            })
          } catch (err) {
            // A missing hero image is not worth failing the whole article over.
            req.payload.logger.error({ err }, 'Hero image fetch failed — continuing without one.')
          }
          return { output: { mediaId: id } }
        },
      })

      const { postId } = await inlineTask('assemble-post', {
        task: async ({ req }) => {
          const { payload } = req

          let categoryId: number | null = null
          if (en.categorySlug) {
            const match = await payload.find({
              collection: 'categories',
              locale: 'en',
              where: { slug: { equals: en.categorySlug } },
              limit: 1,
              depth: 0,
            })
            categoryId = match.docs[0]?.id ?? null
          }

          const contentEn = await markdownToLexical(payload.config, en.contentMarkdown)
          const contentCs = await markdownToLexical(payload.config, cs.contentMarkdown)

          const enData = {
            title: en.title,
            excerpt: en.excerpt,
            content: contentEn,
            ctaHeadline: en.ctaHeadline,
            seo: {
              title: en.seoTitle,
              description: seoDescription(en.seoDescription),
              image: mediaId ?? undefined,
            },
            heroImage: mediaId ?? undefined,
            heroStyle: 'photo' as const,
            authors: settings.defaultAuthor
              ? [typeof settings.defaultAuthor === 'object' ? settings.defaultAuthor.id : settings.defaultAuthor]
              : undefined,
            categories: categoryId ? [categoryId] : undefined,
            publishedAt: topic.targetPublishDate ?? undefined,
            _status: 'draft' as const,
          }

          const existingPostId =
            typeof topic.post === 'object' && topic.post !== null ? topic.post.id : topic.post

          let postId: number
          if (existingPostId) {
            // Regeneration: overwrite the draft's content, keep id/slug (old text
            // stays in version history). draft:true keeps a published post live.
            await payload.update({
              collection: 'posts',
              id: existingPostId,
              locale: 'en',
              draft: true,
              data: enData,
            })
            postId = existingPostId
          } else {
            const created = await payload.create({
              collection: 'posts',
              locale: 'en',
              draft: true,
              data: enData,
            })
            postId = created.id
          }

          await payload.update({
            collection: 'posts',
            id: postId,
            locale: 'cs',
            draft: true,
            data: {
              title: cs.title,
              excerpt: cs.excerpt,
              content: contentCs,
              ctaHeadline: cs.ctaHeadline,
              seo: { title: cs.seoTitle, description: seoDescription(cs.seoDescription) },
              _status: 'draft' as const,
            },
          })

          await payload.update({
            collection: 'blog-topics',
            id: topicId,
            data: { status: 'ready', post: postId, error: null },
          })

          return { output: { postId } }
        },
      })

      await notify(
        payload,
        settings.notificationEmail,
        `Blog draft ready for review: ${en.title}`,
        [
          `<p>The AI-generated draft for topic <strong>${topic.title}</strong> is ready.</p>`,
          `<p><a href="${SERVER_URL}/admin/collections/posts/${postId}">Review and publish it in the admin</a>.</p>`,
        ].join('\n'),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      payload.logger.error({ err }, `Blog generation failed for topic ${topicId}`)
      await payload.update({
        collection: 'blog-topics',
        id: topicId,
        data: { status: 'failed', error: message },
      })
      await notify(
        payload,
        settings.notificationEmail,
        `Blog generation failed: ${topic.title}`,
        [
          `<p>Generating the article for topic <strong>${topic.title}</strong> failed:</p>`,
          `<pre>${message}</pre>`,
          `<p><a href="${SERVER_URL}/admin/collections/blog-topics/${topicId}">Open the topic</a> — set its status back to “Queued” to retry after fixing the cause.</p>`,
        ].join('\n'),
      )
      throw err
    }
  },
}
