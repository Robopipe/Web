import { readIndexNowKey } from '@/lib/indexNow'
import { getPayloadClient } from '@/lib/queries'

// Read the key at request time, so a key changed in site settings needs no new build.
export const dynamic = 'force-dynamic'

/**
 * IndexNow key file (keyLocation in every submission, issue #40). Search
 * engines compare its body with the key in the request. Without a key in
 * site settings or INDEXNOW_KEY the file does not exist.
 */
export async function GET(): Promise<Response> {
  const key = await readIndexNowKey(await getPayloadClient())
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
