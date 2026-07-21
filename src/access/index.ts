import type { Access } from 'payload'

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const admins: Access = ({ req: { user } }) => user?.role === 'admin'

/** Public sees only published docs; logged-in users see drafts too. */
export const publishedOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

/** Deny all — used with the Local API (overrideAccess) so the REST/GraphQL surface stays closed. */
export const nobody: Access = () => false
