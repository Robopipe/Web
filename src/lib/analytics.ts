/**
 * Custom event hook. Vercel Analytics is gone (the site runs on Coolify, where
 * its script answers 404), so this does nothing until a new tool is chosen.
 */
export const trackEvent = (_event: string, _props?: Record<string, string>): void => {}
