// Issue #45: check that the copy from code is on the page and the old copy is not.
// Also takes header and footer screenshots of /cs and /en.
// Usage: BASE_URL=http://localhost:3945 node docs/specs/45-copy-in-code/verify.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL || 'http://localhost:3945'
const SCREENS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screens')

const FOOTER = {
  cs: { has: ['robopipe s.r.o. Všechna práva vyhrazena.'], not: ['s.r.o.. Všechna práva vyhrazena.'] },
  en: { has: ['robopipe s.r.o. All rights reserved.'], not: ['s.r.o.. All rights reserved.'] },
}
const QUOTE = {
  cs: { has: ['„Lidé na hale konečně vidí kvalitu své práce v reálném čase'], not: ['“Lidé na hale', 'si přidáváme sami.”', 'od zákazníka.”'] },
  en: { has: [], not: ['„'] },
}

const PAGES = [
  { path: '/cs', locale: 'cs', has: [], not: [] },
  { path: '/en', locale: 'en', has: [], not: [] },
  {
    path: '/cs/case-studies',
    locale: 'cs',
    has: [
      'Nasazení AI kontroly kvality ve výrobě a e-shopech',
      'Konkrétní projekty, kde kamery s AI kontrolují výrobu, plnění a katalog produktů.',
      '„Lidé na hale konečně vidí kvalitu své práce v reálném čase. Nikdo už nečeká, až přijde reklamace od zákazníka.“',
      'Vyzkoušejte kameru na své lince',
      'Domluvte si půlhodinové demo a probereme, jak kameru nasadit přímo na vaši linku.',
    ],
    not: [
      'Případy užití AI kontroly kvality: reálné provozy, měřitelné výsledky.',
      'Jak výrobci a sklady po celé Evropě nasazují kamerovou a AI kontrolu kvality na vlastních linkách.',
      'Třeba je na řadě právě váš provoz.',
      'projdeme si, jak by nasazení vypadalo na lince, jako je ta vaše.',
    ],
    title: { has: 'Případové studie AI a kamerové kontroly kvality', not: 'Případy užití AI' },
  },
  {
    path: '/en/case-studies',
    locale: 'en',
    has: [
      'Camera inspection case studies from production',
      'How production and e-commerce teams run AI quality inspection on their lines.',
      'Put a camera over your line',
    ],
    not: [
      'Machine vision use cases: real operations, measured results.',
      'How producers and operators across Europe run AI quality inspection on their own lines.',
      'Your operation could be next.',
    ],
  },
  { path: '/cs/cenik', locale: 'cs', has: [], not: [] },
  { path: '/en/pricing', locale: 'en', has: [], not: [] },
]

const browser = await chromium.launch({ channel: 'chromium' })
let failures = 0
const check = (label, ok) => {
  if (!ok) failures++
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`)
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const p of PAGES) {
  const res = await page.goto(BASE + p.path, { waitUntil: 'networkidle' })
  check(`${p.path} status ${res?.status()}`, res?.status() === 200)
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
  const hasQuote = /Lidé na hale|The floor team/.test(text)
  const has = [...p.has, ...FOOTER[p.locale].has, ...(hasQuote ? QUOTE[p.locale].has : [])]
  const not = [...p.not, ...FOOTER[p.locale].not, ...QUOTE[p.locale].not]
  for (const s of has) check(`${p.path} has "${s.slice(0, 60)}"`, text.includes(s))
  for (const s of not) check(`${p.path} lacks "${s.slice(0, 60)}"`, !text.includes(s))
  if (p.title) {
    const title = await page.title()
    check(`${p.path} title has "${p.title.has}"`, title.includes(p.title.has))
    check(`${p.path} title lacks "${p.title.not}"`, !title.includes(p.title.not))
  }
}

mkdirSync(SCREENS, { recursive: true })
for (const [name, viewport] of [
  ['desktop-1440', { width: 1440, height: 900 }],
  ['mobile-390', { width: 390, height: 844 }],
]) {
  const shot = await browser.newPage({ viewport })
  for (const locale of ['cs', 'en']) {
    await shot.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' })
    await shot.locator('header').first().screenshot({ path: path.join(SCREENS, `${locale}-header-${name}.png`) })
    const footer = shot.locator('footer').last()
    // The sticky header would cover the footer in the element screenshot.
    await shot.addStyleTag({ content: 'header { position: static !important; }' })
    await footer.scrollIntoViewIfNeeded()
    await footer.screenshot({ path: path.join(SCREENS, `${locale}-footer-${name}.png`) })
    const overflow = await shot.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    check(`/${locale} ${name} has no horizontal overflow`, !overflow)
  }
  await shot.close()
}

await browser.close()
console.log(failures ? `${failures} check(s) failed` : 'all checks passed')
process.exit(failures ? 1 : 0)
