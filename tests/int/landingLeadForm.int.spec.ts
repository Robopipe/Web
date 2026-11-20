import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Page } from '@/payload-types'
import {
  applyLandingLeadForm,
  leadFormBlockId,
  parseLandingLeadFormArgs,
  readLandingLeadFormCopy,
  withFormBeforeClosingCta,
} from '@/seed/landingLeadForm'

/** Issue #65: the lead form on the ad landing pages, phone optional. */

// submitLead reads the request headers and cookies. Each test sets its own.
const request = vi.hoisted(() => ({ headers: {} as Record<string, string> }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(request.headers),
  cookies: async () => ({ get: () => undefined }),
}))

type Block = NonNullable<Page['layout']>[number]

const block = (id: string, blockType: 'hero' | 'ctaBanner' | 'faqAccordion'): Block =>
  ({ id, blockType }) as Block
const formBlock = block('form', 'hero')

describe('withFormBeforeClosingCta', () => {
  it('puts the form right before a closing CTA banner and keeps the banner', () => {
    const layout = [block('a', 'hero'), block('b', 'faqAccordion'), block('c', 'ctaBanner')]
    expect(withFormBeforeClosingCta(layout, formBlock).map((b) => b.id)).toEqual([
      'a',
      'b',
      'form',
      'c',
    ])
  })

  it('adds the form at the end when the page does not end with a CTA banner', () => {
    const layout = [block('a', 'ctaBanner'), block('b', 'faqAccordion')]
    expect(withFormBeforeClosingCta(layout, formBlock).map((b) => b.id)).toEqual(['a', 'b', 'form'])
    expect(withFormBeforeClosingCta([], formBlock)).toEqual([formBlock])
  })
})

describe('parseLandingLeadFormArgs', () => {
  it('reads the flags', () => {
    expect(parseLandingLeadFormArgs([])).toEqual({ dryRun: false, production: false })
    expect(
      parseLandingLeadFormArgs(['--dry-run', '--production', '--remote=https://robopipe.io']),
    ).toEqual({ dryRun: true, production: true, remote: 'https://robopipe.io' })
  })

  it('stops on an unknown or repeated argument with the usage line', () => {
    expect(() => parseLandingLeadFormArgs(['--dryrun'])).toThrow(/seed:landing-lead-form/)
    expect(() => parseLandingLeadFormArgs(['--dry-run', '--dry-run'])).toThrow(/twice/)
  })
})

describe('applyLandingLeadForm with Payload', () => {
  let payload: Payload
  const copy = readLandingLeadFormCopy()

  const published = async (slug: string) =>
    (
      await payload.find({
        collection: 'pages',
        where: { slug: { equals: slug } },
        locale: 'cs',
        draft: false,
        depth: 0,
        limit: 1,
      })
    ).docs[0]

  /** Publishes the layout without its form block, as production is before the script. */
  const removeForm = async (slug: string) => {
    const page = await published(slug)
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      data: {
        layout: (page.layout ?? []).filter((b) => b.blockType !== 'contactForm'),
        _status: 'published',
      },
    })
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await applyLandingLeadForm(payload)
  }, 120_000)

  it('names the three landing pages of the search campaign', () => {
    expect(copy.pages).toEqual([
      'home',
      'kamerova-kontrola-kvality',
      'detekce-vad-na-vyrobni-lince',
    ])
  })

  it('shows one form without the sidebar before the closing CTA, in both locales', async () => {
    for (const slug of copy.pages) {
      const page = await published(slug)
      const layout = page.layout ?? []
      const forms = layout.filter((b) => b.blockType === 'contactForm')
      expect(forms, slug).toHaveLength(1)
      const at = layout.indexOf(forms[0])
      expect(layout[at + 1]?.blockType ?? 'end', slug).toMatch(/^(ctaBanner|end)$/)
      expect(forms[0]).toMatchObject({ id: leadFormBlockId(slug), showSidebar: false, ...copy.cs })

      const en = await payload.findByID({
        collection: 'pages',
        id: page.id,
        locale: 'en',
        depth: 0,
      })
      expect(
        en.layout?.map((b) => b.blockType),
        slug,
      ).toEqual(layout.map((b) => b.blockType))
      expect(en.layout?.[at]).toMatchObject({ showSidebar: false, ...copy.en })
    }
  })

  it('adds a missing form without changing the English texts of the other blocks', async () => {
    const slug = copy.pages[1]
    await removeForm(slug)
    const { id } = await published(slug)
    const english = () =>
      payload.findByID({ collection: 'pages', id, locale: 'en', draft: false, depth: 0 })
    const before = await english()

    const report = await applyLandingLeadForm(payload)
    expect(report.updated).toEqual([`page ${slug} (form before the closing CTA)`])

    const after = await english()
    expect(after._status).toBe('published')
    expect(after.title).toBe(before.title)
    expect(after.layout?.filter((b) => b.blockType !== 'contactForm')).toEqual(before.layout)
  })

  it('changes nothing on a second run, also not in a dry run', async () => {
    const dry = await applyLandingLeadForm(payload, { dryRun: true })
    const real = await applyLandingLeadForm(payload)
    for (const report of [dry, real]) {
      expect(report.updated).toEqual([])
      expect(report.skipped).toEqual([])
      expect(report.unchanged).toHaveLength(copy.pages.length)
    }
  })

  it('skips a page with an unpublished draft, so the draft is not published', async () => {
    const slug = copy.pages[2]
    await removeForm(slug)
    const page = await published(slug)
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'cs',
      draft: true,
      data: { title: `${page.title} (koncept)`, _status: 'draft' },
    })
    try {
      const report = await applyLandingLeadForm(payload)
      expect(report.skipped).toEqual([
        `page ${slug} (unpublished draft: publish or discard it, then run again)`,
      ])
      expect((await published(slug)).layout?.some((b) => b.blockType === 'contactForm')).toBe(false)
    } finally {
      await payload.update({
        collection: 'pages',
        id: page.id,
        locale: 'cs',
        data: { title: page.title, _status: 'published' },
      })
      await applyLandingLeadForm(payload)
    }
    expect((await published(slug)).layout?.some((b) => b.blockType === 'contactForm')).toBe(true)
  })
})

describe('submitLead without a phone number', () => {
  const MARK = `int65-${Date.now()}`
  let payload: Payload
  let ip = 10

  const form = (fields: Record<string, string>) => {
    request.headers = { 'x-forwarded-for': `198.51.100.${ip++}`, host: 'robopipe.io' }
    const data = new FormData()
    data.set('name', `TEST phone ${MARK}`)
    data.set('email', `test.${MARK}@koala42.com`)
    data.set('phone', '')
    data.set('message', `Testovací poptávka ${MARK} ${ip}`)
    data.set('locale', 'cs')
    for (const [name, value] of Object.entries(fields)) data.set(name, value)
    return data
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'leads',
      where: { message: { contains: MARK } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  })

  it('stores the lead with the source and sends the email without a phone line', async () => {
    const findGlobal = payload.findGlobal.bind(payload)
    vi.spyOn(payload, 'findGlobal').mockImplementation((async (
      args: Parameters<Payload['findGlobal']>[0],
    ) => ({
      ...(await findGlobal(args)),
      leadNotificationEmail: 'sales@example.com',
    })) as Payload['findGlobal'])
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const { submitLead } = await import('@/actions/submitLead')

    const state = await submitLead(
      { status: 'idle' },
      form({ utm_source: 'test-65', sourcePage: '/cs/kamerova-kontrola-kvality' }),
    )
    expect(state.status).toBe('success')

    const { docs } = await payload.find({
      collection: 'leads',
      where: { message: { equals: `Testovací poptávka ${MARK} ${ip}` } },
      overrideAccess: true,
      depth: 0,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].phone || null).toBeNull()
    expect(docs[0].attribution).toMatchObject({ utmSource: 'test-65', sourceFrom: 'formPage' })
    const text = (sendEmail.mock.calls[0][0] as { text: string }).text
    expect(text).toContain('utm_source: test-65')
    expect(text).not.toContain('Phone:')
  })

  it('still needs the name, the email and the message', async () => {
    const { submitLead } = await import('@/actions/submitLead')
    for (const field of ['name', 'email', 'message']) {
      const state = await submitLead({ status: 'idle' }, form({ [field]: '' }))
      expect(state, field).toEqual({ status: 'error', error: 'validation' })
    }
  })
})
