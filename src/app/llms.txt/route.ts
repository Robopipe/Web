import { getIndexableDocs } from '@/lib/indexable'
import { buildLlmsTxt } from '@/lib/llmsTxt'
import { getPayloadClient } from '@/lib/queries'

export const revalidate = 600

/** /llms.txt (llmstxt.org): summary and key links for language models. */
export async function GET(): Promise<Response> {
  const payload = await getPayloadClient()
  const [docs, settings] = await Promise.all([
    getIndexableDocs(),
    payload.findGlobal({ slug: 'site-settings', locale: 'all', depth: 0 }),
  ])
  // With locale 'all', localized fields come back as { cs, en }.
  const description = (settings.defaultSeo?.description ?? {}) as unknown as Record<string, string>

  const body = buildLlmsTxt(docs, {
    siteName: settings.siteName,
    descriptions: { cs: description.cs, en: description.en },
    contactEmail: settings.contactEmail,
    phone: settings.contact?.phone,
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
