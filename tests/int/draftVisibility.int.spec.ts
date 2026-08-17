import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '@/jobs/markdown'
import { getPosts } from '@/lib/queries'

/**
 * Regression guard: draft posts must never reach the public site.
 *
 * The Local API bypasses access control unless a caller passes
 * overrideAccess: false, so `publishedOrLoggedIn` on the Posts collection does
 * nothing by default. Listing queries missed that flag, which put unpublished
 * drafts on /blog and into the sitemap and RSS feed.
 */

let payload: Payload
const created: number[] = []

const SLUG_PUBLISHED = 'int-test-published-post'
const SLUG_DRAFT = 'int-test-draft-post'

describe('draft visibility', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const content = await markdownToLexical(payload.config, 'Body text for the fixture post.')
    const published = await payload.create({
      collection: 'posts',
      locale: 'en',
      data: { title: 'Int test published post', content, _status: 'published' },
    })
    const draft = await payload.create({
      collection: 'posts',
      locale: 'en',
      draft: true,
      data: { title: 'Int test draft post', _status: 'draft' },
    })
    created.push(published.id, draft.id)
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'posts', id })
    }
  })

  it('omits drafts from the public post list', async () => {
    const slugs = (await getPosts('en', { limit: 500 })).docs.map((doc) => doc.slug)
    expect(slugs).toContain(SLUG_PUBLISHED)
    expect(slugs).not.toContain(SLUG_DRAFT)
  })

  it('still returns drafts when access control is bypassed', async () => {
    // Documents why the flag is load-bearing: without overrideAccess: false the
    // very same query happily hands back the draft.
    const result = await payload.find({
      collection: 'posts',
      locale: 'en',
      fallbackLocale: false,
      where: { slug: { exists: true } },
      limit: 500,
      depth: 0,
    })
    expect(result.docs.map((doc) => doc.slug)).toContain(SLUG_DRAFT)
  })
})
