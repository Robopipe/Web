import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { getRedirect } from './queries'

/**
 * For a missing document: follow the first matching entry in the `redirects`
 * collection, else 404. Paths are tried in order, so pass the most specific first.
 */
export const redirectOrNotFound = async (paths: string[]): Promise<never> => {
  for (const path of paths) {
    const redirectDoc = await getRedirect(path)
    if (redirectDoc) {
      if (redirectDoc.permanent) permanentRedirect(redirectDoc.to)
      redirect(redirectDoc.to)
    }
  }
  notFound()
}
