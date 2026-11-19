/**
 * Company facts with a public source; issues #19 and #40. Change them here when
 * they change. Organization JSON-LD and /llms.txt read them.
 * - foundingDate: ARES, datum vzniku of robopipe s.r.o. (IČO 24111791).
 * - numberOfEmployees, parent: the /o-nas page ("spin-off of KOALA42",
 *   "The team has 5 people today").
 * - LinkedIn: the company page of Robopipe.
 * - docs: the product documentation (old /documentation redirects there).
 * - billingAddress: registered office from ARES, for the billing details on
 *   the contact page (issue #57). The office address stays in Site Settings.
 */
export const COMPANY_FACTS = {
  foundingDate: '2025-12-31',
  numberOfEmployees: 5,
  parent: { name: 'KOALA42', sameAs: 'https://www.linkedin.com/company/koala42' },
  linkedIn: 'https://www.linkedin.com/company/robopipe-io',
  docs: 'https://docs.robopipe.io',
  billingAddress: 'Plynární 1032/29\n170 00 Praha 7 - Holešovice',
}
