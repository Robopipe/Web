const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/** True when the Postgres connection string points at this machine. */
export const isLocalDatabaseUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Stops scripts and tests that write to the database from touching a remote
 * (production) database by accident. Remote writes need an explicit opt-in.
 */
export const assertLocalDatabase = (url: string | undefined, allowRemote = false): void => {
  if (allowRemote || isLocalDatabaseUrl(url)) return
  throw new Error(
    'DATABASE_URL does not point at localhost or 127.0.0.1. Refusing to write to a remote database. ' +
      'Pass --production to write to production on purpose.',
  )
}
