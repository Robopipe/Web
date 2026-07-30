import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
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
      // The run endpoint (/api/payload-jobs/run) is hit by Vercel Cron, which
      // sends the CRON_SECRET env var as a Bearer token automatically.
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
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: {
              // Media read access is public, so serve files from the Blob CDN
              // instead of streaming through /api/media/file/* functions.
              media: { disablePayloadAccessControl: true },
            },
            token: process.env.BLOB_READ_WRITE_TOKEN,
            // Uploads go browser → Blob directly, bypassing Vercel's ~4.5 MB
            // serverless request-body limit (Media accepts video/PDF).
            clientUploads: true,
            // NB: addRandomSuffix must stay off — the adapter doesn't write the
            // suffixed names back to imageSizes, so their URLs would 404. The
            // store is shared by prod and previews: treat preview admin as
            // read-mostly, uploads there can collide with prod filenames.
            addRandomSuffix: false,
          }),
        ]
      : []),
  ],
})
