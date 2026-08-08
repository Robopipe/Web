import { after } from 'next/server'
import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access'
import { STALE_JOB_MS } from '@/jobs/generateBlogPost'

export const BlogTopics: CollectionConfig = {
  slug: 'blog-topics',
  labels: { singular: 'Blog topic', plural: 'Blog topics' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'targetPublishDate', 'updatedAt'],
    group: 'Blog',
    description:
      'Queue of article ideas for AI generation. Queued topics are picked up by the nightly job, which writes a bilingual draft post for review.',
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  endpoints: [
    {
      // POST /api/blog-topics/:id/generate — run generation for one topic right
      // away instead of waiting for the nightly cron. Returns immediately; the
      // job continues server-side via after() and the topic status tracks it.
      path: '/:id/generate',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return Response.json({ message: 'Unauthorized' }, { status: 401 })
        const id = Number(req.routeParams?.id)
        if (!Number.isFinite(id)) return Response.json({ message: 'Invalid id' }, { status: 400 })

        const { payload } = req
        const topic = await payload.findByID({ collection: 'blog-topics', id, disableErrors: true })
        if (!topic) return Response.json({ message: 'Topic not found' }, { status: 404 })

        // The topic's status alone can lie: a run killed by the platform leaves
        // the topic at "generating" forever. Judge by the job itself — only a
        // processing job whose row was touched recently is genuinely running.
        const pending = await payload.find({
          collection: 'payload-jobs',
          where: {
            workflowSlug: { equals: 'generate-blog-post' },
            completedAt: { exists: false },
          },
          limit: 100,
          depth: 0,
        })
        const jobsForTopic = pending.docs.filter(
          (job) => (job.input as { topicId?: number } | undefined)?.topicId === id,
        )
        const running = jobsForTopic.find((job) => job.processing)
        if (running) {
          if (Date.now() - new Date(running.updatedAt).getTime() < STALE_JOB_MS) {
            return Response.json({ message: 'This topic is already generating.' }, { status: 409 })
          }
          // Zombie from a killed run — release it and run it again below.
          await payload.update({
            collection: 'payload-jobs',
            id: running.id,
            data: { processing: false },
          })
        }

        // Reuse a job already queued for this topic (the afterChange hook queues
        // one whenever status flips to "queued") — queueing another would make
        // the nightly cron regenerate the post a second time.
        const job =
          running ??
          jobsForTopic[0] ??
          (await payload.jobs.queue({ workflow: 'generate-blog-post', input: { topicId: id } }))

        await payload.update({ collection: 'blog-topics', id, data: { status: 'generating', error: null } })

        after(async () => {
          try {
            await payload.jobs.runByID({ id: job.id })
          } catch (err) {
            payload.logger.error({ err }, `Instant blog generation failed for topic ${id}`)
          }
        })

        return Response.json({ message: 'Generation started', jobID: job.id })
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const becameQueued =
          doc.status === 'queued' && (operation === 'create' || previousDoc?.status !== 'queued')
        if (!becameQueued) return doc
        await req.payload.jobs.queue({
          workflow: 'generate-blog-post',
          input: { topicId: doc.id },
        })
        req.payload.logger.info(`Queued blog generation for topic ${doc.id} ("${doc.title}")`)
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Working title / topic idea. Claude writes the final title itself.' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: {
        rows: 6,
        description:
          'What the article should cover: angle, key points, facts to include, target reader. The more grounding, the better the draft.',
      },
    },
    {
      name: 'extraInstructions',
      type: 'textarea',
      admin: {
        description: 'Optional one-off instructions for this article, on top of the Blog AI base prompt.',
      },
    },
    {
      name: 'targetPublishDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Prefills publishedAt on the generated draft. Does not delay generation — topics generate on the next nightly run.',
      },
    },
    {
      name: 'generateNow',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/GenerateNowButton' },
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'queued',
      options: [
        { label: 'Queued', value: 'queued' },
        { label: 'Generating', value: 'generating' },
        { label: 'Draft ready', value: 'ready' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Set back to "Queued" to regenerate (overwrites the draft content; old text stays in version history).',
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      admin: { position: 'sidebar', readOnly: true, description: 'The generated draft post.' },
    },
    {
      name: 'error',
      type: 'textarea',
      admin: { position: 'sidebar', readOnly: true, description: 'Last generation error, if any.' },
    },
  ],
}
