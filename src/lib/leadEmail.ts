/**
 * Which inquiry emails are company emails (issue #26). Pure functions without Node or the DOM.
 * The Google Ads export, the Google tag and the admin all decide through these functions.
 */

/** Public mail services. Everything else is a company email. The only list (issue #26). */
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // cz
  'seznam.cz',
  'email.cz',
  'post.cz',
  'spoluzaci.cz',
  'centrum.cz',
  'atlas.cz',
  'volny.cz',
  'tiscali.cz',
  'quick.cz',
  'o2active.cz',
  'iol.cz',
  // sk
  'azet.sk',
  'centrum.sk',
  'zoznam.sk',
  'pobox.sk',
  'atlas.sk',
  'post.sk',
  'tiscali.sk',
  'inmail.sk',
  'stonline.sk',
  // Google
  'gmail.com',
  'googlemail.com',
  // Microsoft
  'outlook.com',
  'outlook.cz',
  'outlook.sk',
  'outlook.de',
  'outlook.at',
  'outlook.fr',
  'outlook.it',
  'outlook.es',
  'outlook.co.uk',
  'hotmail.com',
  'hotmail.cz',
  'hotmail.de',
  'hotmail.fr',
  'hotmail.it',
  'hotmail.es',
  'hotmail.co.uk',
  'live.com',
  'live.cz',
  'live.de',
  'live.at',
  'live.fr',
  'live.it',
  'live.co.uk',
  'msn.com',
  // Yahoo, AOL
  'yahoo.com',
  'yahoo.de',
  'yahoo.fr',
  'yahoo.it',
  'yahoo.es',
  'yahoo.co.uk',
  'ymail.com',
  'rocketmail.com',
  'aol.com',
  'aol.de',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // Proton, Tuta, Zoho
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'pm.me',
  'tutanota.com',
  'tutanota.de',
  'tutamail.com',
  'tuta.io',
  'tuta.com',
  'zoho.com',
  'zohomail.com',
  'zohomail.eu',
  // de, at, ch
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'gmx.at',
  'gmx.ch',
  'web.de',
  't-online.de',
  'freenet.de',
  'posteo.de',
  'mailbox.org',
  // pl, ru
  'wp.pl',
  'o2.pl',
  'onet.pl',
  'interia.pl',
  'mail.ru',
  'bk.ru',
  'inbox.ru',
  'list.ru',
  'yandex.ru',
  'yandex.com',
  'ya.ru',
  // other
  'mail.com',
  'fastmail.com',
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
