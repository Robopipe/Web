import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Authors } from './collections/Authors'
import { CaseStudies } from './collections/CaseStudies'
import { Categories } from './collections/Categories'
import { FAQs } from './collections/FAQs'
import { Leads } from './collections/Leads'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Redirects } from './collections/Redirects'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { SiteSettings } from './globals/SiteSettings'
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
    CaseStudies,
    Testimonials,
    FAQs,
    Leads,
    Media,
    Redirects,
    Users,
  ],
  globals: [Header, Footer, SiteSettings],
  editor: lexicalEditor(),
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
    ...(process.env.GCS_BUCKET
      ? [
          gcsStorage({
            collections: { media: true },
            bucket: process.env.GCS_BUCKET,
            options: {
              projectId: process.env.GCS_PROJECT_ID,
            },
          }),
        ]
      : []),
  ],
})
