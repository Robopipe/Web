/**
 * Cookie helpers for client components. They read and write `document.cookie`,
 * so call them only in the browser (effects and event handlers).
 */

/**
 * `undefined` when the cookie is missing or its value is not valid percent encoding.
 * Another app on the domain or a manual edit can write such a value, and a throw here
 * would break every page that reads the cookie in an effect.
 */
export function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  if (!match) return undefined
  try {
    return decodeURIComponent(match[1])
  } catch {
    return undefined
  }
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${secure}`
}

/** Names of all cookies this page can see. */
export function cookieNames(): string[] {
  return document.cookie
    .split('; ')
    .map((pair) => pair.split('=')[0])
    .filter(Boolean)
}

/**
 * Deletes a cookie on this host and, when `domain` is set, on that domain too.
 * A cookie set with `domain=.example.com` survives a delete without the domain.
 */
export function deleteCookie(name: string, domain?: string): void {
  const expired = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  document.cookie = expired
  if (domain) document.cookie = `${expired}; domain=${domain}`
}
