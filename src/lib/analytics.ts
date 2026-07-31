import { track } from '@vercel/analytics'

/** Custom events require the Vercel Pro plan; on Hobby the calls are silently dropped. */
export const trackEvent = (event: string, props?: Record<string, string>): void => {
  track(event, props)
}
