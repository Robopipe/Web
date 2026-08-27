import 'dotenv/config'

import config from '@payload-config'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import type { IconName } from '@/components/icons'

import { MEDIA_ALT_CS } from './csCopyFixes'

/**
 * Development/staging seed: the full site content from the approved design
 * (claude.ai/design project 5effe350, copy extracted into seed-assets/copy),
 * in both locales. Czech is the default locale; English is layered on top.
 * Skips when a home page already exists.
 *
 * Run with: pnpm seed
 */

const ASSETS = path.resolve(process.cwd(), 'seed-assets')
const COPY = path.join(ASSETS, 'copy')

/* ----------------------------- lexical helpers ----------------------------- */

const BOLD = 1
const ITALIC = 2

type LexicalText = { type: 'text'; text: string; version: 1; format?: number }

/** Parse **bold** and *italic* spans into lexical text nodes. */
const parseInline = (text: string): LexicalText[] => {
  const nodes: LexicalText[] = []
  for (const part of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)) {
    if (!part) continue
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push({ type: 'text', text: part.slice(2, -2), version: 1, format: BOLD })
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push({ type: 'text', text: part.slice(1, -1), version: 1, format: ITALIC })
    } else {
      nodes.push({ type: 'text', text: part, version: 1 })
    }
  }
  return nodes
}

/**
 * Constrained markdown → lexical: paragraphs, ## headings, and
 * `> [!callout]` blockquotes (rendered as lime callout boxes on the site).
 */
const mdToLexical = (md: string) => {
  const children = md
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('## ')) {
        return {
          type: 'heading',
          tag: 'h2',
          children: parseInline(trimmed.slice(3)),
          version: 1,
        }
      }
      if (trimmed.startsWith('>')) {
        const text = trimmed
          .split('\n')
          .map((line) => line.replace(/^>\s?/, ''))
          .filter((line) => line.trim() !== '[!callout]')
          .join(' ')
          .trim()
        return { type: 'quote', children: parseInline(text), version: 1 }
      }
      return { type: 'paragraph', children: parseInline(trimmed), version: 1 }
    })

  return {
    root: {
      type: 'root',
      children,
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

const richText = (text: string) => mdToLexical(text)

const readCopy = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(COPY, file), 'utf8'))
const readMd = (file: string): string => fs.readFileSync(path.join(COPY, file), 'utf8')

/* ------------------------------- row ids ---------------------------------- */

/**
 * Inject deterministic ids into array/block rows so that the cs create and the
 * en update address the SAME rows — localized subfields then merge per row
 * instead of being recreated (which would drop the other locale's values).
 */
const withRowIds = <T>(value: T, prefix: string): T => {
  const walk = (v: unknown, p: string): unknown => {
    if (Array.isArray(v)) {
      return v.map((item, i) => {
        const walked = walk(item, `${p}_${i}`)
        if (walked && typeof walked === 'object' && !Array.isArray(walked)) {
          const obj = walked as Record<string, unknown>
          if (!('root' in obj) && !obj.id) return { id: `${p}_${i}`, ...obj }
        }
        return walked
      })
    }
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      if ('root' in obj) return v // lexical rich text — leave untouched
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, walk(val, `${p}_${k}`)]))
    }
    return v
  }
  return walk(value, prefix) as T
}

/* --------------------------------- media ----------------------------------- */

const mediaCache = new Map<string, number>()

const uploadMedia = async (payload: Payload, filename: string, alt: string): Promise<number> => {
  const cached = mediaCache.get(filename)
  if (cached) return cached
  const dir = filename.endsWith('.mp4') ? 'video' : 'img'
  const doc = await payload.create({
    collection: 'media',
    data: { alt: MEDIA_ALT_CS[filename] ?? alt },
    filePath: path.join(ASSETS, dir, filename),
  })
  await payload.update({ collection: 'media', id: doc.id, locale: 'en', data: { alt } })
  mediaCache.set(filename, doc.id)
  return doc.id
}

/* ---------------------------------- seed ----------------------------------- */

const seed = async (): Promise<void> => {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })
  if (existing.docs.length) {
    payload.logger.info('Seed skipped — home page already exists.')
    process.exit(0)
  }

  payload.logger.info('Seeding…')

  // --- Admin user (dev credentials; change in real environments) ---
  const users = await payload.find({ collection: 'users', limit: 1 })
  if (!users.docs.length) {
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@robopipe.io',
        password: 'admin',
        name: 'Admin',
        role: 'admin',
      },
    })
  }

  // --- Media ---
  const img = async (filename: string, alt: string) => uploadMedia(payload, filename, alt)

  const media = {
    video: await img('line-loop.mp4', 'Production line running under camera inspection'),
    logoCrocodille: await img('logo-crocodille.png', 'Crocodille'),
    logoBageterie: await img('logo-bageterie.jpg', 'Bageterie Boulevard'),
    logoMgservis: await img('logo-mgservis.png', 'MG Servis'),
    logoWolfberry: await img('logo-wolfberry.png', 'Wolfberry'),
    logoFoodstr: await img('logo-foodstr.png', 'Foodstr'),
    annotateUi: await img('annotate-ui.png', 'Robopipe annotation studio'),
    dashboardUi: await img('dashboard-ui.png', 'Real-time production dashboard'),
    cameraLine: await img('camera-line.jpeg', 'Sealed camera mounted above a production line'),
    controllerBox: await img('controller-box.png', 'Robopipe AI PLC controller'),
    inspectionDetection: await img('inspection-detection.jpg', 'Defect detection on a food line'),
    pharmaHmi: await img('pharma-hmi.jpeg', 'Pharma line HMI panel'),
    retailPacking: await img('retail-packing.jpg', 'Retail order packing station'),
    logisticsWarehouse: await img('logistics-warehouse.png', 'Logistics warehouse aisle'),
    inspectionIdentify: await img('inspection-identify.webp', 'Camera identifying products on the line'),
    tabletLine: await img('tablet-line.png', 'Floor tablet showing a live quality score'),
    useCaseFood: await img('use-case-food.png', 'Sandwich production line'),
    sandwichLine: await img('sandwich-line-inspection.jpg', 'Sandwich line inspection'),
    productClassification: await img('product-classification-screen.jpeg', 'Product classification screen'),
    retailTagging: await img('retail-tagging.jpeg', 'AI product tagging station'),
    foodBaguette: await img('food-baguette-inspection.png', 'Baguette inspection overlay'),
    contactMap: await img('contact-map.webp', 'Map of the Robopipe HQ in Prague — Karlín'),
  }

  // --- Blog taxonomy + author ---
  const makeCategory = async (cs: [string, string], en: [string, string]) => {
    const doc = await payload.create({
      collection: 'categories',
      data: { title: cs[0], slug: cs[1] },
    })
    await payload.update({
      collection: 'categories',
      id: doc.id,
      locale: 'en',
      data: { title: en[0], slug: en[1] },
    })
    return doc.id
  }

  const categories = {
    guide: await makeCategory(['Návod', 'navod'], ['Guide', 'guide']),
    story: await makeCategory(['Příběh', 'pribeh'], ['Story', 'story']),
    engineering: await makeCategory(['Technologie', 'engineering'], ['Engineering', 'engineering']),
  }

  const author = await payload.create({
    collection: 'authors',
    data: { name: 'Jan Jelínek', role: 'Robopipe' },
  })

  // --- FAQs ---
  const makeFaq = async (cs: { q: string; a: string }, en: { q: string; a: string }) => {
    const doc = await payload.create({
      collection: 'faqs',
      data: { question: cs.q, answer: richText(cs.a) },
    })
    await payload.update({
      collection: 'faqs',
      id: doc.id,
      locale: 'en',
      data: { question: en.q, answer: richText(en.a) },
    })
    return doc.id
  }

  const homeFaqs = [
    await makeFaq(
      {
        q: 'Můžeme nové produkty přidávat sami?',
        a: 'Ano. Nový produkt si přidáte sami — kameře stačí ukázat několik správných kusů a kontrola může začít. Bez techniků a bez čekání na výjezd dodavatele.',
      },
      {
        q: 'Can we add new products ourselves?',
        a: 'Yes. Adding a product is self-service — show it a few good examples and it starts checking. No engineers or vendor visits needed.',
      },
    ),
    await makeFaq(
      {
        q: 'Vydrží to sanitaci a tlakové mytí?',
        a: 'Ano. Hardware má krytí IP67 a je plně utěsněný — nevadí mu pára, tlakové mytí ani mráz v chladírně.',
      },
      {
        q: 'Will it survive our washdown area?',
        a: 'The hardware is IP67-rated and fully sealed for steam, spray and cold stores.',
      },
    ),
    await makeFaq(
      {
        q: 'Co vlastně vidí operátoři?',
        a: 'Velký přehled přímo na hale: kolik kusů dnes prošlo, jaké vady se objevují nejčastěji a okamžitou zpětnou vazbu k právě běžící výrobě.',
      },
      {
        q: 'What do operators actually see?',
        a: "A live floor dashboard with today's pass rate, top defects and instant feedback.",
      },
    ),
    await makeFaq(
      {
        q: 'Za jak dlouho začneme kontrolovat?',
        a: 'Většina linek kontroluje do jednoho dne od instalace — namontujeme kameru, vy přidáte produkt a jede se.',
      },
      {
        q: "How long until we're inspecting?",
        a: 'Most lines are live within a day — mount, add your product, go.',
      },
    ),
  ]

  const pricingFaqs = [
    await makeFaq(
      {
        q: 'Je hardware v ceně?',
        a: 'Ano. Kamera s krytím IP67 i řídicí jednotka AI PLC jsou v každém tarifu zahrnuté formou pronájmu — hardware zvlášť nekupujete.',
      },
      {
        q: 'Is hardware included in the price?',
        a: 'Yes. The IP67 camera and AI PLC controller are included as rental in every plan — there is no separate hardware purchase.',
      },
    ),
    await makeFaq(
      {
        q: 'Co všechno instalace zahrnuje?',
        a: 'Přijedeme k vám, namontujeme utěsněnou kameru nad linku, zapojíme ji a zaškolíme obsluhu. U tarifů Pro a Enterprise je instalace v ceně.',
      },
      {
        q: 'What does on-site install cover?',
        a: "Our team mounts the sealed camera over your line, wires it in and trains your operators. It's included on Pro and Enterprise.",
      },
    ),
    await makeFaq(
      {
        q: 'Můžeme začít s jednou kamerou a postupně přidávat?',
        a: 'Přesně na to je tarif Standard — všechno si vyzkoušíte na jedné kameře a další můžete kdykoli přidat, případně přejít na vyšší tarif. Nic se znovu neinstaluje.',
      },
      {
        q: 'Can we start small and scale?',
        a: "That's the point of the Standard plan — prove it on one camera, then add cameras and upgrade whenever you're ready. No re-install needed.",
      },
    ),
    await makeFaq(
      {
        q: 'Napojíte se na naše ERP?',
        a: 'Ano. V tarifu Enterprise propojíme Robopipe s vaším ERP i MES přes Modbus, EtherCAT nebo Ethernet a modely i hardware přizpůsobíme přímo vaší lince.',
      },
      {
        q: 'Do you integrate with our ERP?',
        a: 'On Enterprise we connect Robopipe to your ERP and MES over Modbus, EtherCAT and Ethernet, and tailor models and hardware to your line.',
      },
    ),
    await makeFaq(
      {
        q: 'Můžeme si Robopipe provozovat sami?',
        a: 'Ano. Robopipe nabízíme i jako open-source variantu, kterou si můžete provozovat na vlastní infrastruktuře — najdete ji na našem GitHubu. K vlastnímu provozu poskytujeme jen komunitní podporu; placené tarify zahrnují hardware, provoz, aktualizace i naši podporu.',
      },
      {
        q: 'Can we self-host Robopipe?',
        a: "Yes. Robopipe is also available as an open-source variant you can run on your own infrastructure — you'll find it on our GitHub. Self-hosting comes with community support only; paid plans include the hardware, hosting, updates and our support.",
      },
    ),
  ]

  // --- Testimonials ---
  // #1 (oldest) feeds the pull quote on the case-studies listing.
  const pullQuote = await payload.create({
    collection: 'testimonials',
    data: {
      quote:
        'Lidé na hale konečně vidí kvalitu své práce v reálném čase. Nikdo už nečeká, až přijde reklamace od zákazníka.',
      personName: 'Vedoucí kvality',
      personRole: 'Vedoucí kvality',
      company: 'Crocodille',
    },
  })
  await payload.update({
    collection: 'testimonials',
    id: pullQuote.id,
    locale: 'en',
    data: {
      quote:
        'The floor team finally sees their quality score live. Nobody waits for a customer complaint anymore.',
      personRole: 'Head of Quality',
    },
  })

  const homeQuote = await payload.create({
    collection: 'testimonials',
    data: {
      quote:
        'Lidé na hale konečně vidí kvalitu své práce v reálném čase — a kvalita díky tomu šla nahoru. Stačilo, aby nám ukázali, jak označit první produkt; všechny další už si přidáváme sami.',
      personName: 'Vedoucí kvality',
      personRole: 'Vedoucí kvality',
      company: 'Crocodille',
    },
  })
  await payload.update({
    collection: 'testimonials',
    id: homeQuote.id,
    locale: 'en',
    data: {
      quote:
        'The floor team finally sees their quality score live — and quality went up because of it. We were shown how to label one product; the rest we add ourselves.',
      personRole: 'Head of Quality',
    },
  })

  // --- Case studies (listing-only: excerpt + metrics carry the whole story) ---
  type StudySeed = {
    customer: string
    industry: 'food' | 'pharma' | 'retail' | 'logistics'
    featured?: boolean
    logo?: number
    image: number
    cs: { title: string; slug: string; excerpt: string; metrics: [string, string][] }
    en: { title: string; slug: string; excerpt: string; metrics: [string, string][] }
  }

  const studies: StudySeed[] = [
    {
      customer: 'Crocodille',
      industry: 'food',
      featured: true,
      logo: media.logoCrocodille,
      image: media.tabletLine,
      cs: {
        title: 'Kvalita šla nahoru v den, kdy linka prohlédla.',
        slug: 'crocodille-kvalita-na-lince',
        excerpt:
          'Crocodille vyrábí čerstvé sendviče a bagety tempem 3 600 kusů za hodinu na každé lince. Kamera nad linkou zvedla kvalitu samotné výroby: obsluha vidí výsledky své práce v reálném čase na displeji přímo na hale — a je podle nich hodnocená. Týmu jsme ukázali, jak označit první produkt; každý další už si přidali sami.',
        metrics: [
          ['3 600', 'kusů / hod / linka'],
          ['95 %', 'přesnost detekce'],
          ['19', 'různých kontrol na bagetě'],
        ],
      },
      en: {
        title: 'Quality went up the day the line could see it.',
        slug: 'crocodille-line-quality',
        excerpt:
          "Crocodille produces fresh sandwiches and baguettes at 3,600 pieces per hour per line. Installing the camera raised production quality itself: operators see the quality of their work in real time on the floor display — and are evaluated on it. We showed the team how to label one product; every product since, they've added themselves.",
        metrics: [
          ['3,600', 'pieces / hour / line'],
          ['95%', 'detection precision'],
          ['19', 'different checks per baguette'],
        ],
      },
    },
    {
      customer: 'Wolfberry',
      industry: 'pharma',
      logo: media.logoWolfberry,
      image: media.pharmaHmi,
      cs: {
        title: 'V každé dóze přesně tolik kapslí, kolik má být.',
        slug: 'wolfberry-pocitani-kapsli',
        excerpt:
          'Wolfberry plní doplňky stravy do dóz. Robopipe hlídá plnicí linku a u každé dózy ověří, že odchází se správným počtem kapslí. Každé plnění je navíc doložené snímkem, takže špatně naplněná dóza se k zákazníkovi vůbec nedostane.',
        metrics: [
          ['99,5 %', 'přesnost počítání'],
          ['100 %', 'zdokumentovaných dóz'],
        ],
      },
      en: {
        title: 'Every jar filled with the exact capsule count.',
        slug: 'wolfberry-capsule-counting',
        excerpt:
          'Wolfberry fills supplement capsules into jars. Robopipe watches the filling line and verifies that every jar leaves with the exact number of capsules — with an image record of each fill, miscounted jars never reach a customer.',
        metrics: [
          ['99.5%', 'counting precision'],
          ['100%', 'jars documented'],
        ],
      },
    },
    {
      customer: 'E-commerce retailer',
      industry: 'retail',
      image: media.retailTagging,
      cs: {
        title: 'Zalistování produktů: práci na celý úvazek převzala AI.',
        slug: 'ai-tagovani-produktu',
        excerpt:
          'Zalistování nových produktů dřív vytížilo jednoho člověka na plný úvazek: produkt vyfotit, poznat, dohledat parametry na webu a všechno přepsat do systému — pořád dokola. Dnes Robopipe fotku pořídí, položku rozpozná, informace si dohledá na internetu a záznam vyplní sám.',
        metrics: [
          ['< 1 min', 'na zalistovanou položku'],
          ['1', 'ušetřený celý úvazek'],
        ],
      },
      en: {
        title: 'A full-time data-entry job, tagged away by AI.',
        slug: 'ai-product-tagging',
        excerpt:
          "Listing a product used to be one person's entire job: photograph it, identify it, search the web for specs, type it all into the system — repeat. Robopipe now captures the photo, classifies the item, finds the information online and fills the listing automatically.",
        metrics: [
          ['< 1 min', 'per item listed'],
          ['1', 'full-time role automated'],
        ],
      },
    },
    {
      customer: 'MG Servis',
      industry: 'food',
      logo: media.logoMgservis,
      image: media.inspectionDetection,
      cs: {
        title: 'Stoprocentní kontrola balení — bez jediného člověka u pásu navíc.',
        slug: 'mg-servis-kontrola-baleni',
        excerpt:
          'Zákazníci vracejí každý kus, který není stoprocentní — a ruční kontrola je drahá a stejně nikdy nezachytí všechno. Robopipe proto kontroluje každé balení: těsnost svaru, fazole správně zabalené ve slanině i to, že se do obalu nedostal žádný cizí předmět.',
        metrics: [
          ['95 %', 'přesnost detekce'],
          ['5', 'různých kontrol na balení'],
        ],
      },
      en: {
        title: 'Packaging quality checked 100% — without the cost of manual inspection.',
        slug: 'mg-servis-packaging-checks',
        excerpt:
          "Customers return products that aren't 100% — and human quality checks are expensive and never catch everything. Robopipe inspects every pack: seal tightness, beans properly wrapped in bacon, and no foreign objects inside the packaging.",
        metrics: [
          ['95%', 'detection precision'],
          ['5', 'different checks per pack'],
        ],
      },
    },
  ]

  for (const study of studies) {
    const metrics = (pairs: [string, string][]) =>
      pairs.map(([value, label], i) => ({ id: `${study.en.slug}_m${i}`, value, label }))
    const doc = await payload.create({
      collection: 'case-studies',
      data: {
        title: study.cs.title,
        slug: study.cs.slug,
        customer: study.customer,
        industry: study.industry,
        featured: study.featured ?? false,
        customerLogo: study.logo,
        heroImage: study.image,
        excerpt: study.cs.excerpt,
        metrics: metrics(study.cs.metrics),
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'case-studies',
      id: doc.id,
      locale: 'en',
      data: {
        title: study.en.title,
        slug: study.en.slug,
        excerpt: study.en.excerpt,
        metrics: metrics(study.en.metrics),
        _status: 'published',
      },
    })
  }

  // --- Blog posts (bodies from seed-assets/copy/post-*.md) ---
  type BlogCopy = {
    posts: {
      slug: string
      title: string
      category: string
      date: string
      excerpt: string
      lede: string
      heroImage: string
      heroStyle: 'photo' | 'framed'
      ctaHeadline: string
      seo: { title: string; description: string }
    }[]
  }
  const blogCopy = readCopy<BlogCopy>('blog.json')

  const postCs: Record<
    string,
    { title: string; slug: string; excerpt: string; ctaHeadline: string; seo: { title: string; description: string } }
  > = {
    'capture-to-inference': {
      title: 'Od snímku k inferenci: pipeline Robopipe',
      slug: 'od-snimku-k-inferenci',
      excerpt: 'Technická procházka otevřenou smyčkou nasnímat → označit → natrénovat → vyhodnotit, na které stojí každé nasazení.',
      ctaHeadline: 'Spusťte pipeline na vlastních produktech.',
      seo: {
        title: 'Pipeline od snímku k inferenci | Robopipe',
        description:
          'Srozumitelně o čtyřech fázích Robopipe — snímání, označování, trénink a inference — a o tom, co každá z nich doopravdy dělá na reálné výrobní lince.',
      },
    },
    'cut-reject-rates': {
      title: 'Snižte zmetkovitost bez zpomalení výroby',
      slug: 'snizte-zmetkovitost',
      excerpt: 'Jak se kamerová kontrola zaplatí už v prvním měsíci — aniž by k taktu linky přidala jedinou sekundu.',
      ctaHeadline: 'Vyzkoušejte to na vlastním produktu.',
      seo: {
        title: 'Jak živá inspekce snižuje zmetkovitost | Robopipe',
        description:
          'Zmetkovitost ve výrobě potravin nesnižuje přesnější kontrola, ale okamžité zachycení vad. A živý přehled kvality mění i to, jak se chová obsluha linky.',
      },
    },
    'live-quality-score': {
      title: 'Živé skóre kvality pro tým na hale',
      slug: 'zive-skore-kvality',
      excerpt: 'Proč zpětná vazba v reálném čase vyhrává nad směnovými reporty — a co všechno se změnilo, když obsluha uviděla svou úspěšnost naživo.',
      ctaHeadline: 'Dejte živé skóre na svou halu.',
      seo: {
        title: 'Živé skóre kvality na výrobní hale | Robopipe',
        description:
          'Jak živé skóre kvality na hale mění kontrolu ze směnového reportu v něco, na co obsluha reaguje okamžitě.',
      },
    },
    'automated-product-tagging': {
      title: 'Automatické tagování produktů: svěřte metadata katalogu počítačovému vidění',
      slug: 'automaticke-tagovani-produktu',
      excerpt: 'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a plné chyb — a kvůli špatným metadatům se produkty ztrácejí ve vyhledávání. AI tagování řeší všechny tři problémy najednou.',
      ctaHeadline: 'Dejte svůj katalog na autopilota.',
      seo: {
        title: 'Automatické tagování produktů počítačovým viděním | Robopipe',
        description:
          'Jak AI tagování obrázků nahrazuje pomalé a chybové ruční tagování — rozpozná barvu, materiál i styl a ve velkém zlepšuje vyhledávání i SEO e-shopu.',
      },
    },
  }

  const heroImageBySlug: Record<string, number> = {
    'capture-to-inference': media.annotateUi,
    'cut-reject-rates': media.sandwichLine,
    'live-quality-score': media.tabletLine,
    'automated-product-tagging': media.productClassification,
  }
  const categoryByName: Record<string, number> = {
    Guide: categories.guide,
    Story: categories.story,
    Engineering: categories.engineering,
  }

  for (const post of blogCopy.posts) {
    const cs = postCs[post.slug]
    const doc = await payload.create({
      collection: 'posts',
      data: {
        title: cs.title,
        slug: cs.slug,
        excerpt: cs.excerpt,
        heroImage: heroImageBySlug[post.slug],
        heroStyle: post.heroStyle,
        content: mdToLexical(readMd(`post-${post.slug}.cs.md`)),
        ctaHeadline: cs.ctaHeadline,
        authors: [author.id],
        categories: [categoryByName[post.category]],
        publishedAt: new Date(`${post.date} 09:00 UTC`).toISOString(),
        seo: { title: cs.seo.title, description: cs.seo.description },
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'posts',
      id: doc.id,
      locale: 'en',
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.lede,
        content: mdToLexical(readMd(`post-${post.slug}.md`)),
        ctaHeadline: post.ctaHeadline,
        seo: { title: post.seo.title, description: post.seo.description },
        _status: 'published',
      },
    })
  }

  /* ------------------------------- pages ---------------------------------- */

  const logos = [
    { logo: media.logoCrocodille, name: 'Crocodille' },
    { logo: media.logoBageterie, name: 'Bageterie Boulevard' },
    { logo: media.logoMgservis, name: 'MG Servis' },
    { logo: media.logoWolfberry, name: 'Wolfberry' },
    { logo: media.logoFoodstr, name: 'Foodstr' },
  ]

  // --- Contact page (first — internal link target for CTAs) ---
  const contactLayout = (c: {
    chip: string
    h1: string
    sub: string
    formTitle: string
    microcopy: string
  }) =>
    withRowIds(
      [
        {
          blockType: 'hero' as const,
          eyebrow: c.chip,
          heading: c.h1,
          text: c.sub,
          variant: 'centered' as const,
        },
        {
          blockType: 'contactForm' as const,
          heading: c.formTitle,
          microcopy: c.microcopy,
          showSidebar: true,
        },
      ],
      'contact',
    )

  const contactPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Kontakt',
      slug: 'kontakt',
      layout: contactLayout({
        chip: 'Kontakt',
        h1: 'Pojďme dát kameru do vašeho provozu.',
        sub: 'Napište nám, co vyrábíte, a do jednoho pracovního dne se vám ozveme — většinou rovnou s první představou, jak by kontrola vašeho produktu mohla vypadat.',
        formTitle: 'Pošlete nám poptávku',
        microcopy: 'První krok ke kontrole kvality, která běží 24/7.',
      }),
      seo: {
        title: 'Kontakt a demo — Robopipe',
        description:
          'Domluvte si s Robopipe půlhodinové demo vizuální kontroly kvality pro váš provoz, napište obchodnímu týmu nebo zavolejte do naší pražské kanceláře.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: contactPage.id,
    locale: 'en',
    data: {
      title: 'Contact',
      slug: 'contact',
      layout: contactLayout({
        chip: 'Contact',
        h1: "Let's put a camera in your operation.",
        sub: "Tell us what you make and we'll come back within one business day — usually with a first idea of how inspection would work on your product.",
        formTitle: 'Send us a message',
        microcopy: 'Your first step to 24/7 visual inspection.',
      }),
      seo: {
        title: 'Contact & book a demo — Robopipe',
        description:
          'Talk to Robopipe about visual quality control in your operation. Book a 30-minute demo, email sales or call our Czech HQ.',
      },
      _status: 'published',
    },
  })

  const bookDemo = (label: string) => ({
    link: { label, type: 'internal' as const, page: contactPage.id },
  })

  // --- Pricing page ---
  type PricingCopy = {
    hero: { chip: string; h1: string; sub: string }
    tableHeading: string
    tiers: {
      name: string
      tagline: string
      price: string
      period: string
      subNote?: string
      ctaLabel: string
      ctaUrl: string
      ctaNewTab?: boolean
      ctaVariant: 'filled' | 'outlined'
      highlighted?: boolean
      badge?: string
      leadIn?: string
      features: string[]
    }[]
    footnote: string
    logoEyebrow: string
    comparison: {
      heading: string
      columns: string[]
      groups: { label: string; rows: { label: string; values: string[] }[] }[]
    }
    benefits: { heading: string; sub: string; items: { icon: IconName; title: string; body: string }[] }
    faqHeading: string
    cta: { heading: string; sub: string; primary: string; secondary: string }
  }

  const pricingLayout = (c: PricingCopy) =>
    withRowIds(
      [
        {
          blockType: 'hero' as const,
          eyebrow: c.hero.chip,
          heading: c.hero.h1,
          text: c.hero.sub,
          variant: 'centered' as const,
        },
        {
          blockType: 'pricingTable' as const,
          tiers: c.tiers.map((tier) => ({
            name: tier.name,
            tagline: tier.tagline,
            price: tier.price,
            period: tier.period || undefined,
            subNote: tier.subNote,
            featuresLeadIn: tier.leadIn,
            features: tier.features.map((text) => ({ text })),
            cta: {
              label: tier.ctaLabel,
              type: 'external' as const,
              url: tier.ctaUrl,
              newTab: tier.ctaNewTab ?? false,
            },
            ctaVariant: tier.ctaVariant,
            highlighted: tier.highlighted ?? false,
            badge: tier.badge,
          })),
          footnote: c.footnote,
        },
        {
          blockType: 'logoCloud' as const,
          heading: c.logoEyebrow,
          logos,
        },
        {
          blockType: 'planComparison' as const,
          heading: c.comparison.heading,
          columns: c.comparison.columns.map((name) => ({ name })),
          groups: c.comparison.groups.map((group) => ({
            label: group.label,
            rows: group.rows.map((row) => ({
              label: row.label,
              values: row.values.map((value) => ({ value })),
            })),
          })),
        },
        {
          blockType: 'featureGrid' as const,
          heading: c.benefits.heading,
          text: c.benefits.sub,
          background: 'dark' as const,
          columns: '3' as const,
          features: c.benefits.items.map((item) => ({
            icon: item.icon,
            title: item.title,
            text: item.body,
          })),
        },
        {
          blockType: 'faqAccordion' as const,
          heading: c.faqHeading,
          faqs: pricingFaqs,
        },
        {
          blockType: 'ctaBanner' as const,
          heading: c.cta.heading,
          text: c.cta.sub,
          links: [bookDemo(c.cta.primary), bookDemo(c.cta.secondary)],
        },
      ],
      'pricing',
    )

  const comparisonCs = {
    heading: 'Porovnání tarifů',
    columns: ['Open source', 'Standard', 'Pro', 'Enterprise'],
    groups: [
      {
        label: 'Kontrola',
        rows: [
          { label: 'Kamery a závody', values: ['Neomezeně', 'Neomezeně', 'Neomezeně', 'Neomezeně'] },
          {
            label: 'Kontrolované produkty',
            values: ['Neomezeně', 'Neomezeně', 'Neomezeně', 'Neomezeně'],
          },
          { label: 'Samoobslužné nastavení produktů', values: ['✓', '✓', '✓', '✓'] },
          { label: 'Počítání kusů a statistiky', values: ['', '✓', '✓', '✓'] },
          { label: 'Prostoje a takt výroby', values: ['', '✓', '✓', '✓'] },
          {
            label: 'Pokročilá analytika (porovnání závodů, statistiky po jednotlivých kusech)',
            values: ['', '', '✓', '✓'],
          },
        ],
      },
      {
        label: 'Nasazení a podpora',
        rows: [
          {
            label: 'Průmyslová kamera a AI PLC v ceně',
            values: ['Vlastní Raspberry Pi', '✓', '✓', '✓'],
          },
          { label: 'Živý přehled výroby na hale', values: ['', '✓', '✓', '✓'] },
          { label: 'Tréninky modelu', values: ['Na vlastním HW', '5 měsíčně', 'Neomezeně', 'Neomezeně'] },
          { label: 'Instalace a zaškolení u vás', values: ['', '', '✓', '✓'] },
          { label: 'PLC I/O (DI/DO, RS485, EtherCAT, Modbus)', values: ['', '', '✓', '✓'] },
          {
            label: 'Servis a podpora po instalaci',
            values: ['Komunitní', 'E-mail', 'Prioritní', '24/7 SLA'],
          },
          { label: 'Napojení na ERP / MES', values: ['', '', '', '✓'] },
          { label: 'Modely a hardware na míru', values: ['', '', '', '✓'] },
        ],
      },
    ],
  }

  const comparisonEn = {
    heading: 'Compare plans',
    columns: ['Open source', 'Standard', 'Pro', 'Enterprise'],
    groups: [
      {
        label: 'Inspection',
        rows: [
          { label: 'Cameras & sites', values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
          {
            label: 'Inspected products',
            values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
          },
          { label: 'Self-service product setup', values: ['✓', '✓', '✓', '✓'] },
          { label: 'Piece counting & statistics', values: ['', '✓', '✓', '✓'] },
          { label: 'Downtime & production takt', values: ['', '✓', '✓', '✓'] },
          {
            label: 'Advanced analytics (site comparisons, per-part stats)',
            values: ['', '', '✓', '✓'],
          },
        ],
      },
      {
        label: 'Deployment & support',
        rows: [
          {
            label: 'Industrial camera & AI PLC included',
            values: ['Your Raspberry Pi', '✓', '✓', '✓'],
          },
          { label: 'Real-time floor dashboard', values: ['', '✓', '✓', '✓'] },
          {
            label: 'Model trainings',
            values: ['On your hardware', '5 / month', 'Unlimited', 'Unlimited'],
          },
          { label: 'On-site install & training', values: ['', '', '✓', '✓'] },
          { label: 'PLC I/O (DI/DO, RS485, EtherCAT, Modbus)', values: ['', '', '✓', '✓'] },
          {
            label: 'Post-install service & support',
            values: ['Community', 'Email', 'Priority', '24/7 SLA'],
          },
          { label: 'ERP / MES integration', values: ['', '', '', '✓'] },
          { label: 'Custom models & hardware', values: ['', '', '', '✓'] },
        ],
      },
    ],
  }

  const pricingPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Ceník',
      slug: 'cenik',
      layout: pricingLayout({
        hero: {
          chip: 'Ceník',
          h1: 'Zaměstnejte AI, která nespí.',
          sub: 'Hardware, instalace i AI kontrola kvality v jedné pevné měsíční ceně. Začnete s jednou kamerou a další přidáte, kdy budete chtít.',
        },
        tableHeading: '',
        tiers: [
          {
            name: 'Open source',
            tagline: 'Provozujte si Robopipe sami na vlastní infrastruktuře.',
            price: 'Zdarma',
            period: '',
            subNote: 'vlastní hardware · komunitní podpora',
            ctaLabel: 'Zobrazit na GitHubu',
            ctaUrl: 'https://github.com/robopipe',
            ctaNewTab: true,
            ctaVariant: 'outlined' as const,
            features: [
              'Celá pipeline: snímání, trénink i vyhodnocování',
              'Běží na Raspberry Pi',
              'Komunitní podpora na GitHubu',
            ],
          },
          {
            name: 'Standard',
            tagline: 'Vyzkoušejte si všechno na jedné kameře, než přidáte další.',
            price: '9 900 Kč',
            period: '/ kamera / měsíc',
            ctaLabel: 'Začít',
            ctaUrl: '/cs/kontakt?tier=standard',
            ctaVariant: 'outlined',
            features: [
              'Průmyslová kamera s krytím IP67 v ceně',
              'Neomezený počet kamer a produktů',
              'Počítání kusů, statistiky a prostoje',
              'Nové produkty si nastavíte sami v aplikaci Studio',
              'Živý přehled výroby na hale — poběží na jakémkoli tabletu',
              '5 tréninků modelu měsíčně',
              'Podpora e-mailem',
            ],
          },
          {
            name: 'Pro',
            badge: 'Nejoblíbenější',
            tagline: 'Kompletní kontrola kvality pro vaše nejvytíženější provozy.',
            price: '14 900 Kč',
            period: '/ kamera / měsíc',
            ctaLabel: 'Domluvit demo',
            ctaUrl: '/cs/kontakt?tier=pro',
            ctaVariant: 'filled',
            highlighted: true,
            leadIn: 'Vše z tarifu Standard a navíc',
            features: [
              'Pokročilá analytika (prostoje, porovnání závodů, statistiky po jednotlivých kusech)',
              'Neomezený počet tréninků modelu',
              'PLC s digitálními výstupy, RS485, EtherCAT a Modbus',
              'Instalace u vás a zaškolení obsluhy',
              'Servis po instalaci a prioritní podpora',
            ],
          },
          {
            name: 'Enterprise',
            tagline: 'Nasazení napříč závody, napojené na vaše systémy.',
            price: 'Individuálně',
            period: '',
            subNote: 'množstevní ceny · vyhrazená kontaktní osoba',
            ctaLabel: 'Kontaktovat obchod',
            ctaUrl: '/cs/kontakt?tier=enterprise',
            ctaVariant: 'filled',
            leadIn: 'Vše z tarifu Pro a navíc',
            features: ['Napojení na ERP a MES', 'Modely a hardware na míru', 'SLA'],
          },
        ],
        footnote:
          'Všechny placené tarify zahrnují hardware s krytím IP67 pro mokré provozy, aktualizace na dálku a neomezený počet operátorů. Ceny jsou uvedené bez DPH.',
        logoEyebrow: 'Důvěřují nám výrobní provozy a sklady po celé Evropě',
        comparison: comparisonCs,
        benefits: {
          heading: 'S tarifem Pro necháte instalaci i podporu na nás.',
          sub: 'Přijedeme k vám do závodu, namontujeme utěsněnou kameru nad linku a všechno rovnou na místě zprovozníme. Se servisem a podporou jsme vám pak k ruce ještě dlouho po spuštění.',
          items: [
            {
              icon: 'IcoController',
              title: 'Přijedeme k vám',
              body: 'Nainstalujeme kameru i v mokrém, chladném nebo prašném provozu a napojíme ji na systémy, které už používáte.',
            },
            {
              icon: 'IcoSupport',
              title: 'Servis i po instalaci',
              body: 'Průběžný servis, dolaďování a prioritní podpora — od tarifu Pro v ceně.',
            },
            {
              icon: 'IcoRefresh',
              title: 'Vždy aktuální',
              body: 'Modely i software aktualizujeme na dálku, takže kontrola zůstává přesná, i když se váš sortiment mění.',
            },
          ],
        },
        faqHeading: 'Nejčastější otázky k ceně.',
        cta: {
          heading: 'Nevíte, který tarif vybrat?',
          sub: 'Domluvte si půlhodinové demo a společně vybereme tarif, který sedne vašemu provozu i produktům.',
          primary: 'Domluvit demo',
          secondary: 'Kontaktovat obchod',
        },
      }),
      seo: {
        title: 'Ceník — tarify vizuální kontroly Robopipe',
        description:
          'Ceník Robopipe: Standard za 9 900 Kč, Pro za 14 900 Kč za kameru a měsíc, Enterprise na míru. Utěsněný hardware IP67, instalace u vás a AI kontrola kvality v jedné pevné měsíční ceně.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: pricingPage.id,
    locale: 'en',
    data: {
      title: 'Pricing',
      slug: 'pricing',
      layout: pricingLayout({
        hero: {
          chip: 'Pricing',
          h1: 'Hire AI that never sleeps.',
          sub: "Hardware, install and deep-learning inspection in one predictable monthly price. Start with one camera, roll out when you're ready.",
        },
        tableHeading: '',
        tiers: [
          {
            name: 'Open source',
            tagline: 'Run Robopipe yourself on your own infrastructure.',
            price: 'Free',
            period: '',
            subNote: 'Your own hardware · community support',
            ctaLabel: 'View on GitHub',
            ctaUrl: 'https://github.com/robopipe',
            ctaNewTab: true,
            ctaVariant: 'outlined' as const,
            features: [
              'Full pipeline: capture, train and run',
              'Runs on Raspberry Pi',
              'Community support on GitHub',
            ],
          },
          {
            name: 'Standard',
            tagline: 'Prove it on one camera before you scale.',
            price: '€390',
            period: '/ camera / month',
            ctaLabel: 'Get started',
            ctaUrl: '/en/contact?tier=standard',
            ctaVariant: 'outlined',
            features: [
              'Industrial-grade IP67 camera included',
              'Unlimited cameras & products',
              'Piece counting, statistics & downtime',
              'Self-service product setup in studio app',
              'Real-time production floor dashboard that works on any tablet',
              '5 model trainings per month',
              'Email support',
            ],
          },
          {
            name: 'Pro',
            badge: 'Most popular',
            tagline: 'Full quality control across your busiest operations.',
            price: '€590',
            period: '/ camera / month',
            ctaLabel: 'Book a demo',
            ctaUrl: '/en/contact?tier=pro',
            ctaVariant: 'filled',
            highlighted: true,
            leadIn: 'Everything in Standard and',
            features: [
              'Advanced analytics (downtime, site comparisons, per-part statistics)',
              'Unlimited model trainings',
              'PLC with digital outputs, RS485, EtherCAT & Modbus',
              'On-site install & operator training',
              'Post-install service & priority support',
            ],
          },
          {
            name: 'Enterprise',
            tagline: 'Multi-site rollouts wired into your systems.',
            price: 'Custom',
            period: '',
            subNote: 'Volume pricing · dedicated success manager',
            ctaLabel: 'Talk to sales',
            ctaUrl: '/en/contact?tier=enterprise',
            ctaVariant: 'filled',
            leadIn: 'Everything in Pro and',
            features: ['ERP & MES integration', 'Custom models & tailored hardware', 'SLA'],
          },
        ],
        footnote:
          'All paid plans include IP67 washdown-rated hardware, over-the-air updates and unlimited operators. Prices exclude VAT.',
        logoEyebrow: 'Trusted in production and warehouses across Europe',
        comparison: comparisonEn,
        benefits: {
          heading: 'With Pro install and support are on us.',
          sub: 'We come to your plant, mount the sealed camera over your process and set everything up on site — then stay on with service and support long after go-live.',
          items: [
            {
              icon: 'IcoController',
              title: 'We come to you',
              body: 'On-site install in wet, cold and dusty areas — wired into the systems you already run.',
            },
            {
              icon: 'IcoSupport',
              title: 'Post-install support',
              body: 'Ongoing service, tuning and priority support included on Pro and above.',
            },
            {
              icon: 'IcoRefresh',
              title: 'Always up to date',
              body: 'Over-the-air model and software updates keep inspection sharp as your products change.',
            },
          ],
        },
        faqHeading: 'Pricing questions, answered.',
        cta: {
          heading: 'Not sure which plan fits?',
          sub: "Book a 30-minute demo and we'll size it to your operation and products with you.",
          primary: 'Book a demo',
          secondary: 'Talk to sales',
        },
      }),
      seo: {
        title: 'Pricing — Robopipe visual inspection plans',
        description:
          'Robopipe pricing: Standard €390, Pro €590 per camera per month, and custom Enterprise. Sealed IP67 hardware, on-site install and deep-learning inspection in one predictable price.',
      },
      _status: 'published',
    },
  })

  // --- Industries page ---
  type IndustryCopy = {
    hero: { chip: string; h1: string; sub: string }
    sections: {
      anchor: string
      chip: string
      heading: string
      intro: string
      bullets: string[]
      stats: [string, string][]
      image: number
      imageSide: 'left' | 'right'
      background: 'white' | 'tinted'
    }[]
    cta: { heading: string; sub: string; primary: string; secondaryLabel: string; secondaryUrl: string }
  }

  const industriesLayout = (c: IndustryCopy) =>
    withRowIds(
      [
        {
          blockType: 'hero' as const,
          eyebrow: c.hero.chip,
          heading: c.hero.h1,
          text: c.hero.sub,
          variant: 'centered' as const,
        },
        ...c.sections.map((section) => ({
          blockType: 'industrySection' as const,
          anchor: section.anchor,
          chip: section.chip,
          heading: section.heading,
          text: section.intro,
          image: section.image,
          imageSide: section.imageSide,
          background: section.background,
          bullets: section.bullets.map((text) => ({ text })),
          stats: section.stats.map(([value, label]) => ({ value, label })),
        })),
        {
          blockType: 'ctaBanner' as const,
          heading: c.cta.heading,
          text: c.cta.sub,
          links: [
            bookDemo(c.cta.primary),
            {
              link: {
                label: c.cta.secondaryLabel,
                type: 'external' as const,
                url: c.cta.secondaryUrl,
              },
            },
          ],
        },
      ],
      'industries',
    )

  const industriesImages = {
    food: media.foodBaguette,
    pharma: media.pharmaHmi,
    retail: media.retailPacking,
    logistics: media.logisticsWarehouse,
  }

  const industriesPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Obory',
      slug: 'obory',
      layout: industriesLayout({
        hero: {
          chip: 'Obory',
          h1: 'Strojové vidění pro čtyři úplně různé provozy.',
          sub: 'Nasnímat, označit, natrénovat, vyhodnotit — každé nasazení stojí na stejné otevřené pipeline, vyladěné podle toho, co vaše linka opravdu vyrábí, balí nebo expeduje.',
        },
        sections: [
          {
            anchor: 'food',
            chip: 'Potravinářství',
            heading: 'Potravinářství: kontrola každého kusu v tempu linky.',
            intro:
              'Od kompletace sendvičů po třídění ovoce — Robopipe zkontroluje úplně každý kus, který projede pod kamerou, ať jde o mokrý provoz, chladírnu, nebo pekárnu plnou moučného prachu.',
            bullets: [
              'Chybějící, špatně umístěné nebo zaměněné suroviny na kompletovaných produktech',
              'Detekce cizích předmětů',
              'Kontrola porcí, odhad hmotnosti z obrazu a míry naplnění',
              'Počítání kusů, podíl OK kusů a takt linky na displeji přímo na hale',
            ],
            stats: [
              ['3 600', 'zkontrolovaných produktů / hod'],
              ['−32 %', 'zmetkovitost v prvním měsíci'],
            ],
            image: industriesImages.food,
            imageSide: 'left',
            background: 'white',
          },
          {
            anchor: 'pharma',
            chip: 'Farmacie a zdravotnictví',
            heading: 'Farmacie a zdravotnictví: zkontrolované plnění, uzávěry i etikety.',
            intro:
              'Plnění kapslí, blistrování i etiketování zkontrolované kus po kusu — a ke každé kontrole obrazový záznam do vaší dokumentace kvality.',
            bullets: [
              'Míra naplnění, kompletnost kapslí a blistrů',
              'Přítomnost a správná pozice víček, plomb a uzávěrů',
              'Přítomnost a orientace etikety, čitelnost kódu šarže',
              'Obrazový archiv všech OK i NOK kusů, připravený k exportu pro audit',
            ],
            stats: [
              ['99,5 %', 'přesnost detekce'],
              ['100 %', 'zdokumentovaných kusů'],
            ],
            image: industriesImages.pharma,
            imageSide: 'right',
            background: 'tinted',
          },
          {
            anchor: 'retail',
            chip: 'Retail a e-commerce',
            heading: 'Retail a e-commerce: celý katalog otagovaný AI.',
            intro:
              'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a náchylné k chybám — a kvůli špatným metadatům se produkty ztrácejí ve vyhledávání. Robopipe si vaše produktové fotky prohlédne a tagy doplní za vás, aby katalog zůstal přehledný a dohledatelný, i když roste.',
            bullets: [
              'Nové produkty zalistované z fotky — barva, materiál, velikost i styl rozpoznané automaticky',
              'Jednotné názvosloví napříč celým katalogem — bez překlepů, vynechávek a nejednotných štítků',
              'Lepší SEO a vyhledávání: „černá kožená kancelářská židle" najde správný produkt',
              'Zvládne sezónní kolekce i desítky tisíc SKU, aniž byste museli nabírat další lidi',
              'Pokryjeme i fulfilment: obsah objednávky ověříme a každou odeslanou krabici doložíme fotografií',
              'Analýza regálů: kontrola prodejen v digitální podobě — fotky regálů se vyhodnotí automaticky, aby zboží na svém místě nikdy nechybělo',
            ],
            stats: [
              ['10k+', 'otagovaných obrázků denně'],
              ['0', 'hodin ručního tagování'],
            ],
            image: industriesImages.retail,
            imageSide: 'left',
            background: 'white',
          },
          {
            anchor: 'logistics',
            chip: 'Logistika',
            heading: 'Logistika: bezpečnější sklad, který máte v číslech.',
            intro:
              'Kamery nepřetržitě hlídají uličky, doky i dopravníky — bezpečnostní rizika nahlásí hned, jak vzniknou, a každý pohyb ve skladu promění v provozní statistiku.',
            bullets: [
              'Skoronehody vysokozdvižných vozíků a chodců — systém je rozpozná, spočítá a vyznačí riziková místa',
              'Chybějící OOPP (vesty, přilby) a neoprávněný vstup do zón pro vozíky',
              'Zablokované únikové východy, rozlité kapaliny a překážky v uličkách nahlášené okamžitě',
              'Překročení rychlosti a jízda v protisměru dohledatelné podle vozíku i směny',
              'Mapy vytížení, prostoje na docích a špičky — podklady pro změnu uspořádání skladu',
              'Statistiky průchodnosti a skoronehod napojené na WMS a bezpečnostní reporting',
            ],
            stats: [
              ['−60 %', 'hlášených bezpečnostních incidentů'],
              ['24/7', 'monitoring a statistiky'],
            ],
            image: industriesImages.logistics,
            imageSide: 'right',
            background: 'tinted',
          },
        ],
        cta: {
          heading: 'Nevidíte tu svou linku?',
          sub: 'Co kamera uvidí, to se Robopipe naučí. Napište nám, co vyrábíte, a ukážeme vám, jak by kontrola vypadala u vás.',
          primary: 'Domluvit demo',
          secondaryLabel: 'Případové studie',
          secondaryUrl: '/cs/case-studies',
        },
      }),
      seo: {
        title: 'Obory — strojové vidění pro potravinářství, farmacii, retail a logistiku | Robopipe',
        description:
          'Jak strojové vidění Robopipe řeší kontrolu kvality v potravinářství, farmacii a zdravotnictví, retailu a e-commerce i logistice — kontrola každého kusu, počítání, tagování produktů a bezpečnost skladu.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: industriesPage.id,
    locale: 'en',
    data: {
      title: 'Industries',
      slug: 'industries',
      layout: industriesLayout({
        hero: {
          chip: 'Industries',
          h1: 'Machine vision for four very different floors.',
          sub: 'Capture, label, train, infer — the same open pipeline behind every deployment, tuned to what your line actually makes, packs or ships.',
        },
        sections: [
          {
            anchor: 'food',
            chip: 'Food processing',
            heading: 'Food processing: every piece checked at line speed.',
            intro:
              'From sandwich assembly to fruit sorting, Robopipe inspects every product passing the camera — in washdown areas, cold stores and flour dust alike.',
            bullets: [
              'Missing, misplaced or wrong ingredients on assembled products',
              'Foreign-object detection',
              'Portion, weight-by-vision and fill-level checks',
              'Piece counting, pass rate and takt on the floor display',
            ],
            stats: [
              ['3,600', 'products / hour inspected'],
              ['−32%', 'reject rate in month one'],
            ],
            image: industriesImages.food,
            imageSide: 'left',
            background: 'white',
          },
          {
            anchor: 'pharma',
            chip: 'Pharma & healthcare',
            heading: 'Pharma & healthcare: verified fills, closures and labels.',
            intro:
              'Capsule filling, blister packing and labelling verified piece by piece — with an image record of every inspection for your quality documentation.',
            bullets: [
              'Fill level, capsule and blister completeness',
              'Cap, seal and closure presence and position',
              'Label presence, orientation and batch-code legibility',
              'Image archive of every pass and reject, exportable for audits',
            ],
            stats: [
              ['99.5%', 'detection precision'],
              ['100%', 'of pieces documented'],
            ],
            image: industriesImages.pharma,
            imageSide: 'right',
            background: 'tinted',
          },
          {
            anchor: 'retail',
            chip: 'Retail & e-commerce',
            heading: 'Retail & e-commerce: your whole catalog, tagged by AI.',
            intro:
              'Tagging thousands of product images by hand is slow, inconsistent and error-prone — and bad metadata buries products in search. Robopipe reads your product photos and writes the tags for you, keeping the whole catalog searchable as it grows.',
            bullets: [
              'New products listed from a photo — color, material, size and style extracted automatically',
              'Uniform terminology across the entire catalog — no typos, omissions or mixed labels',
              'Better SEO and site search: “black leather office chair” finds the right product',
              'Scales to seasonal collections and tens of thousands of SKUs without extra headcount',
              'Fulfilment covered too: order contents verified with photo proof of every shipped box',
              'Shelf analytics: store checks digitized — products on shelf photos detected and classified to improve on-shelf availability',
            ],
            stats: [
              ['10k+', 'images tagged per day'],
              ['0', 'hours of manual tagging'],
            ],
            image: industriesImages.retail,
            imageSide: 'left',
            background: 'white',
          },
          {
            anchor: 'logistics',
            chip: 'Logistics',
            heading: 'Logistics: a safer, measured warehouse.',
            intro:
              'Cameras watch aisles, docks and conveyors around the clock — flagging safety hazards the moment they appear and turning every movement into operational statistics.',
            bullets: [
              'Forklift–pedestrian near-misses detected, counted and mapped to their hotspots',
              'Missing PPE (vests, helmets) and unauthorized entry into forklift-only zones',
              'Blocked emergency exits, spills and aisle obstructions flagged the moment they appear',
              'Speeding and wrong-way driving in aisles logged per vehicle and shift',
              'Traffic heatmaps, dock dwell times and congestion peaks — evidence for re-layouts',
              'Throughput and near-miss statistics wired into your WMS and safety reporting',
            ],
            stats: [
              ['−60%', 'safety incidents reported'],
              ['24/7', 'monitoring & statistics'],
            ],
            image: industriesImages.logistics,
            imageSide: 'right',
            background: 'tinted',
          },
        ],
        cta: {
          heading: "Don't see your line here?",
          sub: "If a camera can see it, Robopipe can learn it. Tell us what you make and we'll show you what inspection would look like.",
          primary: 'Book a demo',
          secondaryLabel: 'See case studies',
          secondaryUrl: '/en/case-studies',
        },
      }),
      seo: {
        title: 'Industries — Machine vision for food, pharma, retail & logistics | Robopipe',
        description:
          'See how Robopipe machine vision solves quality control across food processing, pharma & healthcare, retail & e-commerce and logistics — piece inspection, counting, tagging and warehouse safety.',
      },
      _status: 'published',
    },
  })

  // --- Privacy policy page ---
  const privacyCs = `Provozovatelem webu robopipe.io je společnost Robopipe s.r.o., Thámova 13, 186 00 Praha 8 — Karlín („my"). Tyto zásady vysvětlují, jaké osobní údaje zpracováváme a proč.

## Jaké údaje zpracováváme

**Kontaktní formulář.** Když odešlete poptávku nebo si objednáte demo, uložíme údaje, které nám sdělíte — jméno, společnost, pracovní e-mail, telefon, odvětví a vaši zprávu — abychom vám mohli odpovědět a připravit nabídku. Právním základem je jednání o smlouvě a náš oprávněný zájem na vyřízení poptávky.

**Newsletter.** Pokud se přihlásíte k odběru, uchováváme vaši e-mailovou adresu, abychom vám občas poslali nové články. Odhlásit se můžete kdykoli odpovědí na kterýkoli e-mail.

**Analytika.** Používáme analytiku bez cookies, která ukládá pouze agregované statistiky návštěvnosti. Neukládáme žádné osobní údaje, identifikátory napříč weby ani sledovací cookies.

## Jak dlouho údaje uchováváme

Poptávky uchováváme po dobu jednání a následně nejvýše 3 roky pro navazující komunikaci. E-mail v newsletteru uchováváme do vašeho odhlášení.

## Kdo údaje zpracovává

Web provozujeme na platformě Vercel a data ukládáme v EU. E-maily odesíláme přes službu Resend. Údaje neprodáváme ani je nepředáváme třetím stranám pro marketing.

## Vaše práva

Podle GDPR máte právo na přístup ke svým údajům, jejich opravu, výmaz, přenositelnost a právo vznést námitku. Napište nám na jan.jelinek@robopipe.io a ozveme se do jednoho pracovního dne. Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).`

  const privacyEn = `robopipe.io is operated by Robopipe s.r.o., Thámova 13, 186 00 Praha 8 — Karlín, Czech Republic ("we"). This policy explains what personal data we process and why.

## What we process

**Contact form.** When you send an inquiry or book a demo, we store the details you submit — name, company, work email, phone, industry and your message — so we can reply and prepare a proposal. The legal basis is pre-contract negotiation and our legitimate interest in handling your inquiry.

**Newsletter.** If you subscribe, we keep your email address to send you occasional new posts. You can unsubscribe at any time by replying to any email.

**Analytics.** We use cookieless analytics that stores only aggregated traffic statistics. No personal data, no cross-site identifiers and no tracking cookies.

## How long we keep it

Inquiries are kept for the duration of our conversation and then for at most 3 years for follow-up. Your newsletter email is kept until you unsubscribe.

## Who processes it

The site runs on Vercel; data is stored in the EU. Emails are delivered via Resend. We do not sell your data or share it for third-party marketing.

## Your rights

Under the GDPR you have the right to access, correct, delete and port your data, and to object to processing. Write to jan.jelinek@robopipe.io and we will respond within one business day. You can also lodge a complaint with the Czech Office for Personal Data Protection (uoou.gov.cz).`

  const privacyPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Ochrana osobních údajů',
      slug: 'ochrana-osobnich-udaju',
      layout: withRowIds(
        [
          {
            blockType: 'hero' as const,
            heading: 'Ochrana osobních údajů',
            variant: 'centered' as const,
          },
          {
            blockType: 'content' as const,
            width: 'narrow' as const,
            content: mdToLexical(privacyCs),
          },
        ],
        'privacy',
      ),
      seo: {
        title: 'Ochrana osobních údajů — Robopipe',
        description: 'Jak Robopipe s.r.o. zpracovává osobní údaje z kontaktního formuláře a newsletteru.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: privacyPage.id,
    locale: 'en',
    data: {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      layout: withRowIds(
        [
          {
            blockType: 'hero' as const,
            heading: 'Privacy Policy',
            variant: 'centered' as const,
          },
          {
            blockType: 'content' as const,
            width: 'narrow' as const,
            content: mdToLexical(privacyEn),
          },
        ],
        'privacy',
      ),
      seo: {
        title: 'Privacy Policy — Robopipe',
        description: 'How Robopipe s.r.o. processes personal data from the contact form and newsletter.',
      },
      _status: 'published',
    },
  })

  // --- Home page ---
  type HomeCopy = {
    hero: { chip: string; h1: string; sub: string; primary: string; secondary: string }
    trust: { label: string; items: string[] }
    logoEyebrow: string
    features: { heading: string; sub: string; items: { icon: IconName; title: string; body: string }[] }
    industriesGrid: {
      heading: string
      sub: string
      exploreLabel: string
      cards: { title: string; body: string; url: string; image: number }[]
    }
    process: {
      heading: string
      sub: string
      steps: { title: string; body: string }[]
      button: string
      stats: [string, string][]
    }
    quote: { chip: string; exploreLabel: string; linkUrl: string }
    split: { blogHeading: string; faqHeading: string }
    cta: { heading: string; sub: string; button: string }
  }

  const featureImages = [media.annotateUi, media.dashboardUi, media.cameraLine, media.controllerBox]
  const featureStyles = ['framed', 'framed', 'cover', 'cover'] as const

  const homeLayout = (c: HomeCopy) =>
    withRowIds(
      [
        {
          blockType: 'hero' as const,
          eyebrow: c.hero.chip,
          heading: c.hero.h1,
          text: c.hero.sub,
          links: [
            bookDemo(c.hero.primary),
            { link: { label: c.hero.secondary, type: 'internal' as const, page: pricingPage.id } },
          ],
          video: media.video,
          trust: {
            label: c.trust.label,
            items: c.trust.items.map((text) => ({ text })),
          },
          variant: 'centered' as const,
        },
        {
          blockType: 'logoCloud' as const,
          heading: c.logoEyebrow,
          logos,
        },
        {
          blockType: 'featureGrid' as const,
          heading: c.features.heading,
          text: c.features.sub,
          columns: '2' as const,
          features: c.features.items.map((item, i) => ({
            image: featureImages[i],
            imageStyle: featureStyles[i],
            icon: item.icon,
            title: item.title,
            text: item.body,
          })),
        },
        {
          blockType: 'industryCards' as const,
          heading: c.industriesGrid.heading,
          text: c.industriesGrid.sub,
          cards: c.industriesGrid.cards.map((card) => ({
            image: card.image,
            title: card.title,
            text: card.body,
            link: { label: card.title, type: 'external' as const, url: card.url },
            exploreLabel: c.industriesGrid.exploreLabel,
          })),
        },
        {
          blockType: 'processSteps' as const,
          heading: c.process.heading,
          text: c.process.sub,
          image: media.inspectionIdentify,
          steps: c.process.steps.map((step) => ({ title: step.title, text: step.body })),
          cta: bookDemo(c.process.button),
          stats: c.process.stats.map(([value, label]) => ({ value, label })),
        },
        {
          blockType: 'testimonialBar' as const,
          eyebrow: c.quote.chip,
          testimonials: [homeQuote.id],
          link: {
            link: { label: c.quote.exploreLabel, type: 'external' as const, url: c.quote.linkUrl },
          },
        },
        {
          blockType: 'splitSection' as const,
          blog: { heading: c.split.blogHeading, limit: 2 },
          faq: { heading: c.split.faqHeading, faqs: homeFaqs },
        },
        {
          blockType: 'ctaBanner' as const,
          heading: c.cta.heading,
          text: c.cta.sub,
          links: [bookDemo(c.cta.button)],
        },
      ],
      'home',
    )

  const homePage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Robopipe — Vizuální kontrola kvality, kterou svůj produkt naučíte sami',
      slug: 'home',
      layout: homeLayout({
        hero: {
          chip: 'Průmyslové strojové vidění',
          h1: 'AI kontrola kvality, kterou svůj produkt naučíte sami.',
          sub: 'Robopipe přináší AI kontrolu kvality všude, kudy procházejí vaše produkty — do potravinářské výroby, farmaceutického balení, e-commerce fulfilmentu i logistických skladů. Vady zachytíte hned, jak vzniknou. A nepotřebujete k tomu datové vědce.',
          primary: 'Domluvit demo',
          secondary: 'Zobrazit ceník',
        },
        trust: {
          label: 'Ověřeno v provozu:',
          items: ['3 600 produktů / hod', 'přesnost až 99,5 %', 'nasazení < 1 den'],
        },
        logoEyebrow: 'Důvěřují nám výrobní provozy a sklady po celé Evropě',
        features: {
          heading: 'AI kontrola kvality, kterou zvládne váš vlastní tým.',
          sub: 'AI detekce vad navržená pro výrobní halu, ne pro laboratoř.',
          items: [
            {
              icon: 'IcoAddLarge',
              title: 'Nastavíte si sami',
              body: 'Nový produkt přidáte do kontroly za pár minut. Vyfotíte několik správných kusů, potvrdíte, jak má vypadat kus, který je v pořádku, a Robopipe začne kontrolovat — bez techniků, bez ticketů a bez čekání.',
            },
            {
              icon: 'IcoChart',
              title: 'Přehled o výrobě v reálném čase',
              body: 'Displej na hale ukazuje obsluze, jak běží dnešní šarže — počty kusů, podíl OK kusů, nejčastější vady, prostoje i takt. Zpětná vazba přichází okamžitě a tým na ni reaguje přímo u linky.',
            },
            {
              icon: 'IcoBox',
              title: 'Odolné i v nejnáročnějším provozu',
              body: 'Plně utěsněný hardware s krytím IP67 vydrží páru, tlakové mytí, prach i mráz v chladírně. Namontujete ho přímo nad linku a při sanitaci ho umyjete spolu se zbytkem haly.',
            },
            {
              icon: 'IcoConnector',
              title: 'Připojí se k čemukoli',
              body: 'Volitelná univerzální řídicí jednotka AI PLC s analogovými i digitálními vstupy a výstupy, RS485/RS232, Modbus a EtherCAT po Ethernetu — napojí se na systémy, které už provozujete, včetně ERP a WMS.',
            },
          ],
        },
        industriesGrid: {
          heading: 'Postaveno pro váš obor.',
          sub: 'Stejná pipeline — nasnímat, označit, natrénovat, vyhodnotit — vyladěná pro čtyři úplně různé provozy.',
          exploreLabel: 'Prozkoumat',
          cards: [
            {
              title: 'Potravinářství',
              body: 'Vady, cizí předměty a kontrola porcí v tempu linky.',
              url: '/cs/obory#food',
              image: media.inspectionDetection,
            },
            {
              title: 'Farmacie a zdravotnictví',
              body: 'Kontrola plnění, uzávěrů a etiket s kompletní auditní stopou.',
              url: '/cs/obory#pharma',
              image: media.pharmaHmi,
            },
            {
              title: 'Retail a e-commerce',
              body: 'Produktové fotky otaguje AI — katalog zůstane přehledný a dohledatelný.',
              url: '/cs/obory#retail',
              image: media.retailPacking,
            },
            {
              title: 'Logistika',
              body: 'Bezpečnostní rizika hlášená okamžitě a provoz skladu přehledně v číslech.',
              url: '/cs/obory#logistics',
              image: media.logisticsWarehouse,
            },
          ],
        },
        process: {
          heading: 'AI kontrola v provozu za jediný den.',
          sub: 'Žádní integrátoři, žádné dlouhé projekty. Všechno máte od prvního dne ve svých rukou.',
          steps: [
            {
              title: 'Nainstalujeme u vás',
              body: 'Přijedeme k vám do závodu nebo skladu, namontujeme utěsněnou kameru nad linku a všechno rovnou na místě zprovozníme — i v mokrém, chladném nebo prašném provozu.',
            },
            {
              title: 'Přidejte svůj produkt',
              body: 'Nasnímáte sadu snímků, označíte je a natrénujete model — průvodce vás provede od začátku do konce a strojové učení znát nepotřebujete. Co projde, určujete vy.',
            },
            {
              title: 'Spusťte — s podporou v zádech',
              body: 'Obsluha vidí kvalitu na displeji přímo na hale, vedoucí sledují trendy v analytickém portálu. A my jsme vám i po spuštění k ruce se servisem a podporou.',
            },
          ],
          button: 'Domluvit demo',
          stats: [
            ['< 1 den', 'do první kontroly'],
            ['IP67', 'krytí i pro mokré provozy'],
            ['0', 'datových vědců potřeba'],
            ['24/7', 'monitoring'],
            ['✓', 'funguje i offline'],
          ],
        },
        quote: {
          chip: 'Příběh zákazníka',
          exploreLabel: 'přečtěte si případovou studii',
          linkUrl: '/cs/case-studies',
        },
        split: { blogHeading: 'Z blogu', faqHeading: 'Na co se ptáte nejčastěji.' },
        cta: {
          heading: 'Vyzkoušejte AI kontrolu kvality na vlastních produktech.',
          sub: 'Domluvte si půlhodinové demo a na vlastní oči uvidíte, jak AI najde vady přímo na vašem produktu.',
          button: 'Domluvit demo',
        },
      }),
      seo: {
        title: 'Robopipe — Vizuální kontrola kvality, kterou svůj produkt naučíte sami',
        description:
          'Robopipe přináší AI vizuální kontrolu kvality do potravinářství, farmacie, retailu i logistiky. Utěsněná kamera IP67, trénink modelů svépomocí, živý přehled na hale. Domluvte si demo.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: homePage.id,
    locale: 'en',
    data: {
      title: 'Robopipe — Visual quality control your own team trains',
      slug: 'home',
      layout: homeLayout({
        hero: {
          chip: 'Industrial machine vision',
          h1: 'AI quality control your own team trains.',
          sub: 'Robopipe puts deep-learning inspection wherever your products move — in food plants, pharma packaging, retail fulfilment and logistics hubs. Catch defects in real time. No data scientists required.',
          primary: 'Book a demo',
          secondary: 'See pricing',
        },
        trust: {
          label: 'Trusted in operations running',
          items: ['3,600 products / hour', 'up to 99.5% precision', '< 1 day to go live'],
        },
        logoEyebrow: 'Trusted in production and warehouses across Europe',
        features: {
          heading: 'Deep-learning inspection your own team runs.',
          sub: 'AI defect detection built for the factory floor, not the lab.',
          items: [
            {
              icon: 'IcoAddLarge',
              title: 'Self-service setup',
              body: 'Add a new product to check yourself in minutes. Snap a few good examples, confirm what "right" looks like, and Robopipe starts inspecting — no engineers, no tickets, no waiting.',
            },
            {
              icon: 'IcoChart',
              title: 'Real-time production monitoring',
              body: "A floor display that shows operators how today's batch is running — piece counts, pass rate, top defects, downtime and takt, with instant feedback the team acts on right at the line.",
            },
            {
              icon: 'IcoBox',
              title: 'Built for harsh environments',
              body: 'Fully sealed, IP67 washdown-ready hardware that survives steam, spray, dust and cold stores. Mount it straight above the line and hose it down with the rest of the plant.',
            },
            {
              icon: 'IcoConnector',
              title: 'Connects to anything',
              body: 'An optional versatile AI PLC controller with analog and digital I/O, RS485/RS232, Modbus and EtherCAT over Ethernet — wired into the systems you already run, including your ERP and WMS.',
            },
          ],
        },
        industriesGrid: {
          heading: 'Made to redefine your industry.',
          sub: 'The same pipeline — capture, label, train, infer — tuned to four very different floors.',
          exploreLabel: 'Explore',
          cards: [
            {
              title: 'Food processing',
              body: 'Defects, foreign objects and portion checks at line speed.',
              url: '/en/industries#food',
              image: media.inspectionDetection,
            },
            {
              title: 'Pharma & healthcare',
              body: 'Fill, closure and label verification with full audit trails.',
              url: '/en/industries#pharma',
              image: media.pharmaHmi,
            },
            {
              title: 'Retail & e-commerce',
              body: 'Product photos tagged by AI — catalogs that stay searchable.',
              url: '/en/industries#retail',
              image: media.retailPacking,
            },
            {
              title: 'Logistics',
              body: 'Safety hazards flagged live, movements turned into statistics.',
              url: '/en/industries#logistics',
              image: media.logisticsWarehouse,
            },
          ],
        },
        process: {
          heading: 'AI inspection, live in a day.',
          sub: 'No integrators, no long projects. Your team owns it from day one.',
          steps: [
            {
              title: 'We install on-site',
              body: 'Our team comes to your plant or warehouse, mounts the sealed camera over your line and sets everything up on the spot — wet, cold and dusty areas included.',
            },
            {
              title: 'Add your product',
              body: 'Capture a batch of images, label them and train the model — guided end to end, no ML expertise needed. You stay in control of what passes.',
            },
            {
              title: 'Go live — with support',
              body: 'Operators see quality on the floor display; managers watch trends in the analytics portal. We stay on with post-install service whenever you need us.',
            },
          ],
          button: 'Book a demo',
          stats: [
            ['< 1 day', 'to first inspection'],
            ['IP67', 'washdown rated'],
            ['0', 'data scientists needed'],
            ['24/7', 'monitoring'],
            ['✓', 'works offline'],
          ],
        },
        quote: {
          chip: 'Customer story',
          exploreLabel: 'read the case study',
          linkUrl: '/en/case-studies',
        },
        split: { blogHeading: 'From the blog', faqHeading: 'Questions, answered.' },
        cta: {
          heading: 'See AI quality control on your own products.',
          sub: 'Book a 30-minute demo and watch deep-learning inspection catch defects on your own product.',
          button: 'Book a demo',
        },
      }),
      seo: {
        title: 'Robopipe — Visual quality control your own team trains',
        description:
          'Robopipe puts deep-learning visual inspection across food, pharma, retail and logistics operations. Sealed IP67 camera, self-service training, live floor dashboard. Book a demo.',
      },
      _status: 'published',
    },
  })

  /* ------------------------------- globals --------------------------------- */

  const headerData = (loc: 'cs' | 'en') =>
    withRowIds(
      {
        navItems: [
          {
            link: {
              label: loc === 'cs' ? 'Úvod' : 'Home',
              type: 'internal' as const,
              page: homePage.id,
            },
          },
          {
            link: {
              label: loc === 'cs' ? 'Obory' : 'Industries',
              type: 'internal' as const,
              page: industriesPage.id,
            },
          },
          {
            link: {
              label: loc === 'cs' ? 'Případové studie' : 'Case studies',
              type: 'external' as const,
              url: `/${loc}/case-studies`,
            },
          },
          {
            link: {
              label: loc === 'cs' ? 'Ceník' : 'Pricing',
              type: 'internal' as const,
              page: pricingPage.id,
            },
          },
          { link: { label: 'Blog', type: 'external' as const, url: `/${loc}/blog` } },
          {
            link: {
              label: loc === 'cs' ? 'Kontakt' : 'Contact',
              type: 'internal' as const,
              page: contactPage.id,
            },
          },
        ],
        secondaryLink: {
          link: {
            label: loc === 'cs' ? 'Přihlášení do aplikace' : 'App login',
            type: 'external' as const,
            url: 'https://app.robopipe.io',
            newTab: true,
          },
        },
        cta: bookDemo(loc === 'cs' ? 'Domluvit demo' : 'Book a demo'),
      },
      'hdr',
    )

  await payload.updateGlobal({ slug: 'header', data: headerData('cs') })
  await payload.updateGlobal({ slug: 'header', locale: 'en', data: headerData('en') })

  const footerData = (loc: 'cs' | 'en') =>
    withRowIds(
      {
        note:
          loc === 'cs'
            ? 'AI kontrola kvality pro průmyslové provozy.'
            : 'Deep-learning quality control for industrial operations.',
        columns: [
          {
            title: loc === 'cs' ? 'Produkt' : 'Product',
            links: [
              {
                link: {
                  label: loc === 'cs' ? 'Obory' : 'Industries',
                  type: 'internal' as const,
                  page: industriesPage.id,
                },
              },
              {
                link: {
                  label: loc === 'cs' ? 'Případové studie' : 'Case studies',
                  type: 'external' as const,
                  url: `/${loc}/case-studies`,
                },
              },
              {
                link: {
                  label: loc === 'cs' ? 'Ceník' : 'Pricing',
                  type: 'internal' as const,
                  page: pricingPage.id,
                },
              },
            ],
          },
          {
            title: loc === 'cs' ? 'Zdroje' : 'Resources',
            links: [
              {
                link: {
                  label: loc === 'cs' ? 'Dokumentace' : 'Documentation',
                  type: 'external' as const,
                  url: 'https://robopipe.gitbook.io/doc',
                  newTab: true,
                },
              },
              { link: { label: 'Blog', type: 'external' as const, url: `/${loc}/blog` } },
              {
                link: {
                  label: 'Open source (GitHub)',
                  type: 'external' as const,
                  url: 'https://github.com/robopipe',
                  newTab: true,
                },
              },
            ],
          },
          {
            title: loc === 'cs' ? 'Společnost' : 'Company',
            links: [
              {
                link: {
                  label: loc === 'cs' ? 'Kontakt' : 'Contact',
                  type: 'internal' as const,
                  page: contactPage.id,
                },
              },
              {
                link: {
                  label: loc === 'cs' ? 'Ochrana osobních údajů' : 'Privacy Policy',
                  type: 'internal' as const,
                  page: privacyPage.id,
                },
              },
            ],
          },
        ],
        legalLinks: [
          {
            link: {
              label: loc === 'cs' ? 'Ochrana osobních údajů' : 'Privacy Policy',
              type: 'internal' as const,
              page: privacyPage.id,
            },
          },
        ],
        copyright: 'Robopipe s.r.o.',
      },
      'ftr',
    )

  await payload.updateGlobal({ slug: 'footer', data: footerData('cs') })
  await payload.updateGlobal({ slug: 'footer', locale: 'en', data: footerData('en') })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Robopipe',
      leadNotificationEmail: 'jan.jelinek@robopipe.io',
      contactEmail: 'jan.jelinek@robopipe.io',
      contact: {
        phone: '+420 728 488 116',
        phoneHours: 'Po–Pá, 8:00–17:00',
        address: 'Robopipe s.r.o.\nThámova 13\n186 00 Praha 8 — Karlín\nCzech Republic',
        mapImage: media.contactMap,
        bookingUrl: 'https://calendly.com/jan-jelinek/60min',
        bookingPerson: 'Jan Jelínek',
      },
      socials: [
        { id: 'soc_gh', platform: 'github' as const, url: 'https://github.com/robopipe' },
        {
          id: 'soc_li',
          platform: 'linkedin' as const,
          url: 'https://www.linkedin.com/company/robopipe',
        },
      ],
      defaultSeo: {
        title: 'Robopipe — Vizuální kontrola kvality, kterou svůj produkt naučíte sami',
        description:
          'AI vizuální kontrola kvality pro potravinářství, farmacii, retail a logistiku. Utěsněná kamera IP67, trénink modelů svépomocí, živý přehled na hale.',
        image: media.tabletLine,
      },
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      contact: {
        phone: '+420 728 488 116',
        phoneHours: 'Mon–Fri, 8:00–17:00 CET',
        address: 'Robopipe s.r.o.\nThámova 13\n186 00 Praha 8 — Karlín\nCzech Republic',
        mapImage: media.contactMap,
      },
      defaultSeo: {
        title: 'Robopipe — Visual quality control your own team trains',
        description:
          'Deep-learning visual inspection for food, pharma, retail and logistics. Sealed IP67 camera, self-service training, live floor dashboard.',
        image: media.tabletLine,
      },
    },
  })

  payload.logger.info('Seed complete. Admin login: admin@robopipe.io / admin')
  process.exit(0)
}

void seed()
