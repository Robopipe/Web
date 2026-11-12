/**
 * Login of the Google Ads export (issue #28). Server only: the file imports
 * `node:crypto`. The database keeps a salted scrypt hash, never the password.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const EXPORT_PASSWORD_MIN_LENGTH = 24

// scrypt cost 2^15, block size 8, parallelism 1. Needs 32 MiB, so maxmem is raised.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 32
const PREFIX = 'scrypt'

/** Format: `scrypt$N$r$p$<salt base64>$<key base64>`. */
export const hashExportPassword = (password: string): string => {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, KEY_LENGTH, SCRYPT)
  return [
    PREFIX,
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$')
}

/** False for a malformed hash, so a damaged value closes the export. */
export const verifyExportPassword = (
  password: string,
  stored: string | null | undefined,
): boolean => {
  const parts = (stored ?? '').split('$')
  if (parts.length !== 6 || parts[0] !== PREFIX) return false
  const [N, r, p] = parts.slice(1, 4).map(Number)
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false
  try {
    const actual = scryptSync(password, salt, KEY_LENGTH, { N, r, p, maxmem: SCRYPT.maxmem })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

const sha256 = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest()

/**
 * Checks an HTTP Basic header against the stored login. Without a stored login,
 * the answer is always false. The password check always runs, so the time does
 * not show whether the username matched.
 */
export const checkExportLogin = (
  header: string | null | undefined,
  username: string | null | undefined,
  passwordHash: string | null | undefined,
): boolean => {
  if (!username || !passwordHash || !header) return false
  const match = /^Basic\s+(\S+)$/i.exec(header.trim())
  if (!match) return false
  const decoded = Buffer.from(match[1], 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  if (separator < 0) return false
  const userOk = timingSafeEqual(sha256(decoded.slice(0, separator)), sha256(username))
  const passwordOk = verifyExportPassword(decoded.slice(separator + 1), passwordHash)
  return userOk && passwordOk
}
