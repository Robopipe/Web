/**
 * Company facts with a public source; issues #19 and #40. Change them here when
 * they change. Organization JSON-LD and /llms.txt read them.
 * - foundingDate: ARES, datum vzniku of robopipe s.r.o. (IČO 24111791).
 * - numberOfEmployees, parent: the /o-nas page ("spin-off of KOALA42",
 *   "The team has 5 people today").
 * - LinkedIn: the company page of Robopipe.
 * - docs: the product documentation (old /documentation redirects there).
 */
export const COMPANY_FACTS = {
  foundingDate: '2025-12-31',
  numberOfEmployees: 5,
  parent: { name: 'KOALA42', sameAs: 'https://www.linkedin.com/company/koala42' },
  linkedIn: 'https://www.linkedin.com/company/robopipe-io',
  docs: 'https://docs.robopipe.io',
}
