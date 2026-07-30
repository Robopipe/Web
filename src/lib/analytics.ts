type PlausibleFn = (event: string, options?: { props?: Record<string, string> }) => void

declare global {
  interface Window {
    plausible?: PlausibleFn
  }
}

/** No-ops when Plausible isn't loaded (dev, or NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset). */
export const trackEvent = (event: string, props?: Record<string, string>): void => {
  window.plausible?.(event, props ? { props } : undefined)
}
