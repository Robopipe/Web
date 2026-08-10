import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// 301 map from the old Webflow site to the new structure. The old site served
// English at unprefixed URLs and Czech under /cz. These run before the
// next-intl middleware, so sources stay unprefixed; specific /cz rules must
// precede the /cz catch-all (first match wins). Old /blog and /blog/:slug need
// no rules — the middleware's locale redirect resolves them.
const legacyRedirects = [
  // English
  { source: '/about', destination: '/en', permanent: true },
  { source: '/about-us', destination: '/en', permanent: true },
  { source: '/support', destination: '/en/contact', permanent: true },
  { source: '/gdpr', destination: '/en/privacy-policy', permanent: true },
  { source: '/terms-conditions', destination: '/en', permanent: true },
  { source: '/documentation', destination: 'https://docs.robopipe.io', permanent: true },
  {
    source: '/blog/3-ways-to-automate-your-labeling-with-robo-studio',
    destination: '/en/blog/automated-product-tagging',
    permanent: true,
  },
  // Czech
  { source: '/cz', destination: '/cs', permanent: true },
  { source: '/cz/support', destination: '/cs/kontakt', permanent: true },
  { source: '/cz/gdpr', destination: '/cs/ochrana-osobnich-udaju', permanent: true },
  { source: '/cz/blog', destination: '/cs/blog', permanent: true },
  {
    source: '/cz/blog/3-ways-to-automate-your-labeling-with-robo-studio',
    destination: '/cs/blog/automaticke-tagovani-produktu',
    permanent: true,
  },
  { source: '/cz/:path*', destination: '/cs', permanent: true },
]

// 301/308 map from the decommissioned Shopify store (shop.robopipe.io) to the new
// marketing site. These are host-scoped via `has` so they never touch robopipe.io,
// and use absolute destinations because they redirect cross-host. Requires
// shop.robopipe.io to point at Vercel and be added as a project domain, otherwise
// the requests never reach this app. Specific product URLs first, then a catch-all
// that sweeps every other old Shopify path (/account, /pages/*, other collections…)
// to the homepage so nothing 404s or gets indexed as a duplicate.
const shopHost = [{ type: 'host' as const, value: 'shop.robopipe.io' }]
const shopRedirects = [
  {
    source: '/products/machine-vision-controller',
    has: shopHost,
    destination: 'https://robopipe.io/en/ai-product-tagging',
    permanent: true,
  },
  {
    source: '/collections/all',
    has: shopHost,
    destination: 'https://robopipe.io/en/ai-product-tagging',
    permanent: true,
  },
  { source: '/cart', has: shopHost, destination: 'https://robopipe.io/en/pricing', permanent: true },
  { source: '/:path*', has: shopHost, destination: 'https://robopipe.io/en', permanent: true },
]

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  // Shop rules first so the shop host is fully owned by them (incl. the catch-all)
  // and never falls through into the host-agnostic legacy rules.
  redirects: async () => [...shopRedirects, ...legacyRedirects],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
