import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

for (const locale of ['cs', 'en'] as const) {
  const header = await payload.findGlobal({ slug: 'header', locale })
  const navItems = (header.navItems ?? []).filter((item) => {
    const label = item.link?.label ?? ''
    return label !== 'Úvod' && label !== 'Home'
  })
  await payload.updateGlobal({
    slug: 'header',
    locale,
    data: { navItems },
  })
  console.log(`Updated header (${locale}): ${navItems.map((i) => i.link?.label).join(', ')}`)
}

process.exit(0)
