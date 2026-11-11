/**
 * Which inquiry emails are company emails (issue #26). Pure functions without Node or the DOM.
 * The Google Ads export, the Google tag and the admin all decide through these functions.
 */

/** Public mail services. Everything else is a company email. The only list (issue #26). */
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // cz, sk
  'seznam.cz',
  'email.cz',
  'post.cz',
  'spoluzaci.cz',
  'centrum.cz',
  'atlas.cz',
  'volny.cz',
  'tiscali.cz',
  'quick.cz',
  'azet.sk',
  'centrum.sk',
  'zoznam.sk',
  'pobox.sk',
  // global
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.cz',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'web.de',
  'mail.com',
])

/** Our own domains. An inquiry from them is a test, also from a subdomain. */
export const TEST_EMAIL_DOMAINS: ReadonlySet<string> = new Set(['koala42.com', 'robopipe.io'])

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/** Trim, lowercase, and drop dots before @ for gmail.com and googlemail.com (Google's rule). */
export const normalizeEmail = (email: string): string => {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 0) return trimmed
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  return GMAIL_DOMAINS.has(domain) ? `${local.replaceAll('.', '')}@${domain}` : trimmed
}

/** Part after the last @ of the normalized email, '' when there is none. */
export const emailDomain = (email: string): string => {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  return at < 0 ? '' : normalized.slice(at + 1)
}

/** `false` for an empty or invalid email and for every domain in FREE_EMAIL_DOMAINS. */
export const isBusinessEmail = (email: string): boolean => {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  if (at < 1) return false
  const domain = normalized.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false
  return !FREE_EMAIL_DOMAINS.has(domain)
}

/** Email domain in TEST_EMAIL_DOMAINS, or the trimmed name starts with "TEST" (case-sensitive). */
export const isTestLead = (lead: { email: string; name: string }): boolean => {
  if (lead.name.trim().startsWith('TEST')) return true
  const domain = emailDomain(lead.email)
  if (!domain) return false
  for (const test of TEST_EMAIL_DOMAINS) {
    if (domain === test || domain.endsWith(`.${test}`)) return true
  }
  return false
}
