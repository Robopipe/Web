import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import type { Lead } from '@/payload-types'

import { safeErrorFields } from './logSafe'

export type LeadData = Omit<RequiredDataFromCollectionSlug<'leads'>, 'attribution'>

/**
 * Stores the lead with its attribution (issue #26). When the database rejects the lead with
 * the attribution, stores it again without the attribution: measurement never loses a lead
 * (criterion 11, tester finding B1). The returned lead tells which attribution was stored.
 */
export const createLeadWithAttribution = async (
  payload: Payload,
  data: LeadData,
  attribution: Lead['attribution'],
): Promise<Lead> => {
  try {
    return await payload.create({
      collection: 'leads',
      data: { ...data, attribution },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  } catch (attributionError) {
    payload.logger.warn({
      ...safeErrorFields(attributionError),
      msg: 'Lead with attribution failed, saving without it',
    })
    return payload.create({
      collection: 'leads',
      data,
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
  }
}
