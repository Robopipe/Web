import { indexNowKey } from '@/lib/indexNow'

// Read the key at request time, so a key set or changed in Coolify needs no new build.
export const dynamic = 'force-dynamic'

/**
 * IndexNow key file (keyLocation in every submission, issue #40). Search
 * engines compare its body with the key in the request. Without INDEXNOW_KEY
 * the file does not exist.
 */
export function GET(): Response {
  const key = indexNowKey()
  if (!key) return new Response('Not found', { status: 404 })
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
