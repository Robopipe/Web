import type { Payload } from 'payload'

const slug = 'google-ads-export'

/**
 * Sets the login of the Google Ads export for an int test (issue #28) and returns
 * a function that restores the earlier username and hash. The restore writes
 * through the database adapter, because the global hook never accepts a hash.
 */
export const setExportLogin = async (
  payload: Payload,
  username: string,
  password: string,
): Promise<() => Promise<void>> => {
  const saved = await payload.findGlobal({
    slug,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  await payload.updateGlobal({ slug, data: { username, password }, overrideAccess: true })
  return async () => {
    await payload.db.updateGlobal({
      slug,
      data: { username: saved.username ?? null, passwordHash: saved.passwordHash ?? null },
    })
  }
}
