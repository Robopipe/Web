import config from '@payload-config'
import { getPayload } from 'payload'

import { STALE_JOB_MS } from '@/jobs/generateBlogPost'

/**
 * Nightly job runner, hit by Vercel Cron (replaces Payload's own
 * /api/payload-jobs/run there). Two differences matter on serverless:
 *
 * 1. Self-healing: a run killed by the platform (function maxDuration, deploy)
 *    leaves its jobs stuck at processing: true — which Payload's runner then
 *    skips forever, and the jobs' blog topics hang at "generating". Any job
 *    still marked processing but untouched for longer than a function can
 *    live is dead; release it so it runs again (inline-task checkpoints make
 *    the rerun resume at the step that died).
 * 2. Jobs run one at a time instead of all queued jobs in parallel. Article
 *    generation takes ~3–5 min of Claude calls, so a parallel batch is
 *    guaranteed to blow the 300 s cap and zombie everything still in flight.
 */

export const maxDuration = 300

// Start another job only inside this window: a fresh article generation needs
// ~3–5 of the 5 available minutes, so after one heavy job we stop cleanly
// instead of getting killed mid-run. Checkpoint-resumed and failing-fast jobs
// finish in seconds, so several of those can still drain in one invocation.
const NEW_JOB_BUDGET_MS = 60_000

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const started = Date.now()

  const requeued = await payload.update({
    collection: 'payload-jobs',
    where: {
      and: [
        { processing: { equals: true } },
        { completedAt: { exists: false } },
        { updatedAt: { less_than: new Date(started - STALE_JOB_MS).toISOString() } },
      ],
    },
    data: { processing: false },
  })
  if (requeued.docs.length) {
    payload.logger.info(`Released ${requeued.docs.length} zombie job(s) left by a killed run.`)
  }

  let ran = 0
  let noJobsRemaining = false
  while (Date.now() - started < NEW_JOB_BUDGET_MS) {
    const result = await payload.jobs.run({ limit: 1 })
    noJobsRemaining = !!result.noJobsRemaining
    if (noJobsRemaining) break
    ran++
  }

  return Response.json({ requeued: requeued.docs.length, ran, noJobsRemaining })
}
