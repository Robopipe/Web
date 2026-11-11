import {
  checkBasicAuth,
  EXPORT_WINDOW_DAYS,
  isGoogleAdsLead,
  toCsv,
  toExportRow,
} from '@/lib/googleAds'
import { getPayloadClient } from '@/lib/queries'

/**
 * Company leads for the scheduled upload in Google Ads Data Manager (issue #26).
 * HTTP Basic with GOOGLE_ADS_EXPORT_USER and GOOGLE_ADS_EXPORT_PASSWORD (runtime only).
 * Every run gets the last 90 days. The stable Order ID stops a second conversion.
 */

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="google-ads-export", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })

export const GET = async (request: Request) => {
  const authorized = checkBasicAuth(
    request.headers.get('authorization'),
    process.env.GOOGLE_ADS_EXPORT_USER,
    process.env.GOOGLE_ADS_EXPORT_PASSWORD,
  )
  if (!authorized) return unauthorized()

  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const conversionName = settings.measurement?.leadConversionName?.trim()
  if (!conversionName) {
    // Google Ads shows the failed run instead of a quiet import under the wrong name.
    return new Response('Conversion name missing in site-settings.measurement', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const since = new Date(Date.now() - EXPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const { docs } = await payload.find({
    collection: 'leads',
    where: {
      and: [
        { createdAt: { greater_than_equal: since.toISOString() } },
        { 'attribution.consentMarketing': { equals: true } },
      ],
    },
    pagination: false,
    depth: 0,
    sort: 'createdAt',
    overrideAccess: true,
  })

  const rows = docs.filter(isGoogleAdsLead).map((lead) => toExportRow(lead, conversionName))
  // No emails and no hashes in the log.
  payload.logger.info({ msg: 'Google Ads export', rows: rows.length })

  return new Response(toCsv(rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
