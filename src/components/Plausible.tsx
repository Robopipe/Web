import Script from 'next/script'
import React from 'react'

/** Cookieless analytics — rendered only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. */
export const Plausible: React.FC = () => {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  if (!domain) return null
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  )
}
