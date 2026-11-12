import { request as playwrightRequest } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from './seedUser'

const baseURL = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || '3000'}`

/**
 * Content written with the Local API from the test process does not reach the
 * cache of the server under test: `revalidatePath` only works inside that
 * server. Cached pages such as the blog listing (issue #40) would show old
 * content. This sends the change through the server's REST API instead, so
 * its own afterChange or afterDelete hook revalidates the site.
 */
const withServer = async <T>(
  run: (api: Awaited<ReturnType<typeof playwrightRequest.newContext>>) => Promise<T>,
) => {
  await seedTestUser()
  const api = await playwrightRequest.newContext({ baseURL })
  try {
    const login = await api.post('/api/users/login', { data: testUser })
    if (!login.ok()) throw new Error(`login failed: ${login.status()}`)
    const { token } = (await login.json()) as { token: string }
    const authorized = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `JWT ${token}` },
    })
    try {
      return await run(authorized)
    } finally {
      await authorized.dispose()
    }
  } finally {
    await api.dispose()
    await cleanupTestUser()
  }
}

/** Updates the document through the server, which revalidates the site. */
export const updateOnServer = (
  collection: string,
  id: number,
  locale: string,
  data: Record<string, unknown> = { _status: 'published' },
) =>
  withServer(async (api) => {
    const response = await api.patch(`/api/${collection}/${id}?locale=${locale}`, { data })
    if (!response.ok()) throw new Error(`PATCH ${collection}/${id}: ${response.status()}`)
  })

/** Deletes the document through the server, which revalidates the site. */
export const deleteOnServer = (collection: string, id: number) =>
  withServer(async (api) => {
    const response = await api.delete(`/api/${collection}/${id}`)
    if (!response.ok()) throw new Error(`DELETE ${collection}/${id}: ${response.status()}`)
  })
