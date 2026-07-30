import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { pathFor, type PreviewCollection } from '@/lib/paths'

const collections: PreviewCollection[] = ['pages', 'posts']

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)

  if (!process.env.PREVIEW_SECRET || searchParams.get('secret') !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid preview secret', { status: 401 })
  }

  const collection = searchParams.get('collection') as PreviewCollection
  if (!collections.includes(collection)) {
    return new Response('Unknown collection', { status: 400 })
  }

  const slug = searchParams.get('slug') || 'home'
  const locale = searchParams.get('locale') || 'cs'

  const dm = await draftMode()
  dm.enable()

  redirect(pathFor(collection, slug, locale))
}
