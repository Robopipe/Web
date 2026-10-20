import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Authors } from './collections/Authors'
import { BlogTopics } from './collections/BlogTopics'
import { CaseStudies } from './collections/CaseStudies'
import { Categories } from './collections/Categories'
import { FAQs } from './collections/FAQs'
import { Leads } from './collections/Leads'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Redirects } from './collections/Redirects'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { BlogAI } from './globals/BlogAI'
import { SiteSettings } from './globals/SiteSettings'
import { generateBlogPost } from './jobs/generateBlogPost'
import { SERVER_URL } from './lib/paths'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: SERVER_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  localization: {
    locales: [
      { label: 'Čeština', code: 'cs' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'cs',
    fallback: true,
  },
  collections: [
    Pages,
    Posts,
    Categories,
    Authors,
    BlogTopics,
    CaseStudies,
    Testimonials,
    FAQs,
    Leads,
    NewsletterSubscribers,
    Media,
    Redirects,
    Users,
  ],
  globals: [Header, Footer, SiteSettings, BlogAI],
  editor: lexicalEditor(),
  jobs: {
    workflows: [generateBlogPost],
    access: {
      // The run endpoint (/api/payload-jobs/run) authorizes the CRON_SECRET
      // env var as a Bearer token, for manual/local runs.
      run: ({ req }) => {
        if (req.user) return true
        if (!process.env.CRON_SECRET) return false
        return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
      },
    },
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  ...(process.env.RESEND_API_KEY
    ? {
        email: resendAdapter({
          apiKey: process.env.RESEND_API_KEY,
          defaultFromAddress: 'web@robopipe.io',
          defaultFromName: 'Robopipe',
        }),
      }
    : {}),
  plugins: [
    // Without GCS_BUCKET the plugin disables itself and Payload falls back to
    // local ./media storage. The bucket must also be set at build time: media
    // URLs are baked into prerendered pages.
    gcsStorage({
      enabled: Boolean(process.env.GCS_BUCKET),
      collections: {
        // Media read access is public, so serve files straight from the
        // (publicly readable) bucket instead of streaming through
        // /api/media/file/*.
        media: { disablePayloadAccessControl: true },
      },
      bucket: process.env.GCS_BUCKET || '',
      // Service-account key JSON. Only needed to write/delete: URLs are
      // computed locally, so builds can run without it.
      options: process.env.GCS_CREDENTIALS
        ? { credentials: JSON.parse(process.env.GCS_CREDENTIALS) }
        : {},
    }),
  ],
})
