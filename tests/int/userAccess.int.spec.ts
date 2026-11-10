// @vitest-environment node
// payload.login signs a JWT with jose, which rejects jsdom's Uint8Array.
import { Forbidden, getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

/**
 * Users.update: admins edit anyone, other users only their own account
 * (so an editor can change their own password). The role field stays
 * admin-only, so an editor cannot promote themselves.
 */

let payload: Payload
let admin: User
let editor: User
let otherEditor: User

const EMAIL_PREFIX = 'int-test-user-access'

const createUser = (suffix: string, role: User['role']) =>
  payload.create({
    collection: 'users',
    data: {
      email: `${EMAIL_PREFIX}-${suffix}@example.com`,
      password: 'initial-password',
      name: `Int test ${suffix}`,
      role,
    },
  })

describe('user access', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({
      collection: 'users',
      where: { email: { like: EMAIL_PREFIX } },
    })
    admin = await createUser('admin', 'admin')
    editor = await createUser('editor', 'editor')
    otherEditor = await createUser('other-editor', 'editor')
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'users',
      where: { email: { like: EMAIL_PREFIX } },
    })
  })

  it('lets an editor change their own name and password', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { name: 'Renamed editor', password: 'new-password' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.name).toBe('Renamed editor')

    const login = await payload.login({
      collection: 'users',
      data: { email: editor.email, password: 'new-password' },
    })
    expect(login.user?.id).toBe(editor.id)
  })

  it('stops an editor from editing another user', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: otherEditor.id,
        data: { name: 'Hijacked' },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)

    const unchanged = await payload.findByID({ collection: 'users', id: otherEditor.id })
    expect(unchanged.name).toBe('Int test other-editor')
  })

  it('stops an editor from changing their own role', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: editor.id,
      data: { role: 'admin' },
      user: editor,
      overrideAccess: false,
    })
    expect(updated.role).toBe('editor')

    const stored = await payload.findByID({ collection: 'users', id: editor.id })
    expect(stored.role).toBe('editor')
  })

  it('lets an admin edit any user, role included', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: otherEditor.id,
      data: { name: 'Renamed by admin', role: 'admin' },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.name).toBe('Renamed by admin')
    expect(updated.role).toBe('admin')
  })

  it('denies updates without a logged-in user', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: editor.id,
        data: { name: 'Anonymous' },
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(Forbidden)
  })
})
