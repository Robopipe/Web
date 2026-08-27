import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

// Sets the Calendly booking link shown on the contact page.
// Usage: pnpm tsx src/seed/setBookingLink.ts https://calendly.com/...
const url = process.argv[2]
if (!url || !url.startsWith('https://')) {
  console.error('Pass the Calendly link as the first argument (https://...).')
  process.exit(1)
}

const payload = await getPayload({ config })

const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
await payload.updateGlobal({
  slug: 'site-settings',
  data: {
    contact: {
      ...settings.contact,
      bookingUrl: url,
      bookingPerson: settings.contact?.bookingPerson || 'Jan Jelínek',
    },
  },
})
console.log(`Booking link set to ${url}`)

process.exit(0)
