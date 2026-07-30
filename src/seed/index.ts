import 'dotenv/config'

import config from '@payload-config'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'

import type { IconName } from '@/components/icons'

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
    data: { alt },
    filePath: path.join(ASSETS, dir, filename),
  })
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
    engineering: await makeCategory(['Engineering', 'engineering'], ['Engineering', 'engineering']),
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
        a: 'Ano. Přidání produktu je samoobslužné — ukažte pár správných kusů a kontrola začne. Žádní inženýři ani návštěvy dodavatele.',
      },
      {
        q: 'Can we add new products ourselves?',
        a: 'Yes. Adding a product is self-service — show it a few good examples and it starts checking. No engineers or vendor visits needed.',
      },
    ),
    await makeFaq(
      {
        q: 'Přežije to naši umývanou zónu?',
        a: 'Hardware má krytí IP67 a je plně utěsněný proti páře, ostřiku i chladírnám.',
      },
      {
        q: 'Will it survive our washdown area?',
        a: 'The hardware is IP67-rated and fully sealed for steam, spray and cold stores.',
      },
    ),
    await makeFaq(
      {
        q: 'Co vlastně vidí operátoři?',
        a: 'Živý dashboard na hale s dnešní úspěšností, nejčastějšími vadami a okamžitou zpětnou vazbou.',
      },
      {
        q: 'What do operators actually see?',
        a: "A live floor dashboard with today's pass rate, top defects and instant feedback.",
      },
    ),
    await makeFaq(
      {
        q: 'Za jak dlouho začneme kontrolovat?',
        a: 'Většina linek jede do jednoho dne — namontovat, přidat produkt, spustit.',
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
        a: 'Ano. IP67 kamera i AI PLC kontrolér jsou v každém plánu zahrnuty formou pronájmu — žádný samostatný nákup hardwaru.',
      },
      {
        q: 'Is hardware included in the price?',
        a: 'Yes. The IP67 camera and AI PLC controller are included as rental in every plan — there is no separate hardware purchase.',
      },
    ),
    await makeFaq(
      {
        q: 'Co zahrnuje instalace na místě?',
        a: 'Náš tým namontuje utěsněnou kameru nad vaši linku, zapojí ji a zaškolí operátory. V ceně u plánů Pro a Enterprise.',
      },
      {
        q: 'What does on-site install cover?',
        a: "Our team mounts the sealed camera over your line, wires it in and trains your operators. It's included on Pro and Enterprise.",
      },
    ),
    await makeFaq(
      {
        q: 'Můžeme začít v malém a škálovat?',
        a: 'Přesně k tomu je plán Standard — ověřte si to na jedné kameře a kdykoli budete připraveni, přidávejte další kamery nebo přejděte výš, bez nutnosti nové instalace.',
      },
      {
        q: 'Can we start small and scale?',
        a: "That's the point of the Standard plan — prove it on one camera, then add cameras and upgrade whenever you're ready. No re-install needed.",
      },
    ),
    await makeFaq(
      {
        q: 'Integrujete se s naším ERP?',
        a: 'V plánu Enterprise propojíme Robopipe s vaším ERP a MES přes Modbus, EtherCAT a Ethernet a přizpůsobíme modely i hardware vaší lince.',
      },
      {
        q: 'Do you integrate with our ERP?',
        a: 'On Enterprise we connect Robopipe to your ERP and MES over Modbus, EtherCAT and Ethernet, and tailor models and hardware to your line.',
      },
    ),
  ]

  // --- Testimonials ---
  // #1 (oldest) feeds the pull quote on the case-studies listing.
  const pullQuote = await payload.create({
    collection: 'testimonials',
    data: {
      quote:
        'Tým na hale konečně vidí své skóre kvality živě. Na reklamaci od zákazníka už nikdo nečeká.',
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
        'Tým na hale konečně vidí své skóre kvality živě — a kvalita díky tomu šla nahoru. Ukázali nám, jak označit jeden produkt; všechny další už přidáváme sami.',
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
          'Crocodille vyrábí čerstvé sendviče a bagety rychlostí 3 600 kusů za hodinu na linku. Instalace kamery zvedla kvalitu samotné výroby: operátoři vidí kvalitu své práce v reálném čase na displeji na hale — a jsou podle ní hodnoceni. Ukázali jsme týmu, jak označit jeden produkt; každý další už si přidali sami.',
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
        title: 'Každá dóza naplněná přesným počtem kapslí.',
        slug: 'wolfberry-pocitani-kapsli',
        excerpt:
          'Wolfberry plní doplňky stravy do dóz. Robopipe sleduje plnicí linku a ověřuje, že každá dóza odchází s přesným počtem kapslí. Každé plnění navíc dokumentuje obrazový záznam, takže špatně napočítaná dóza se k zákazníkovi nikdy nedostane.',
        metrics: [
          ['99,5 %', 'přesnost počítání'],
          ['100 %', 'dóz zdokumentováno'],
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
        title: 'Celý úvazek ručního zadávání dat převzala AI.',
        slug: 'ai-tagovani-produktu',
        excerpt:
          'Zalistovat nový produkt bývalo prací na celý úvazek jednoho člověka: vyfotit ho, identifikovat, dohledat parametry na webu a přepsat všechno do systému — pořád dokola. Robopipe dnes fotku pořídí, položku klasifikuje, informace dohledá online a záznam vyplní automaticky.',
        metrics: [
          ['< 1 min', 'na zalistovanou položku'],
          ['1', 'automatizovaný celý úvazek'],
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
        title: 'Kvalita balení kontrolovaná na 100 % — bez nákladů na ruční kontrolu.',
        slug: 'mg-servis-kontrola-baleni',
        excerpt:
          'Zákazníci vracejí produkty, které nejsou stoprocentní — a ruční kontroly kvality jsou drahé a nikdy nezachytí všechno. Robopipe kontroluje každé balení: těsnost svaru, fazole správně zabalené ve slanině a žádné cizí předměty uvnitř obalu.',
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
      excerpt: 'Technický průchod otevřenou smyčkou nasnímat → označit → natrénovat → vyhodnotit, která pohání každé nasazení.',
      ctaHeadline: 'Spusťte pipeline na vlastních produktech.',
      seo: {
        title: 'Pipeline od snímku k inferenci | Robopipe',
        description:
          'Srozumitelný průchod čtyřmi fázemi Robopipe — snímání, označení, trénink, inference — a tím, co každá z nich skutečně dělá na reálné výrobní lince.',
      },
    },
    'cut-reject-rates': {
      title: 'Snižte zmetkovitost bez zpomalení výroby',
      slug: 'snizte-zmetkovitost',
      excerpt: 'Jak se samoobslužná inspekce zaplatí v prvním měsíci — aniž by taktu přidala jedinou sekundu.',
      ctaHeadline: 'Vyzkoušejte to na vlastním produktu.',
      seo: {
        title: 'Jak živá inspekce snižuje zmetkovitost | Robopipe',
        description:
          'Proč zmetkovitost ve výrobě potravin snižuje okamžité zachycení vad — ne přesnější kontrola — a jak živé skóre kvality mění chování operátorů.',
      },
    },
    'live-quality-score': {
      title: 'Živé skóre kvality pro tým na hale',
      slug: 'zive-skore-kvality',
      excerpt: 'Proč zpětná vazba v reálném čase poráží směnové reporty — a co se změnilo, když operátoři viděli svou úspěšnost živě.',
      ctaHeadline: 'Dejte živé skóre na svou halu.',
      seo: {
        title: 'Živé skóre kvality na výrobní hale | Robopipe',
        description:
          'Jak zobrazení skóre kvality v reálném čase na hale mění inspekci ze směnového reportu v něco, na co operátoři reagují okamžitě.',
      },
    },
    'automated-product-tagging': {
      title: 'Automatické tagování produktů: nechte počítačové vidění spravovat metadata katalogu',
      slug: 'automaticke-tagovani-produktu',
      excerpt: 'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a chybové — a špatná metadata pohřbí produkty ve vyhledávání. AI označování řeší všechny tři problémy.',
      ctaHeadline: 'Dejte svůj katalog na autopilota.',
      seo: {
        title: 'Automatické tagování produktů počítačovým viděním | Robopipe',
        description:
          'Jak AI označování obrázků nahrazuje pomalé a chybové ruční tagování — extrahuje barvu, materiál a styl a zlepšuje vyhledávání i SEO e-shopu ve velkém.',
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
        h1: 'Pojďme dát kameru na váš proces.',
        sub: 'Napište nám, co vyrábíte, a ozveme se do jednoho pracovního dne — obvykle rovnou s první představou, jak by inspekce fungovala na vašem produktu.',
        formTitle: 'Objednat demo',
        microcopy: 'Váš první krok k vizuální kontrole 24/7.',
      }),
      seo: {
        title: 'Kontakt a demo — Robopipe',
        description:
          'Promluvte si s Robopipe o vizuální kontrole kvality ve vašem provozu. Objednejte si 30minutové demo, napište obchodu nebo zavolejte do pražského sídla.',
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
        h1: "Let's put a camera on your process.",
        sub: "Tell us what you make and we'll come back within one business day — usually with a first idea of how inspection would work on your product.",
        formTitle: 'Book a demo',
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
            cta: { label: tier.ctaLabel, type: 'external' as const, url: tier.ctaUrl },
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
    heading: 'Porovnání plánů',
    columns: ['Standard', 'Pro', 'Enterprise'],
    groups: [
      {
        label: 'Inspekce',
        rows: [
          { label: 'Kamery a lokality', values: ['Neomezeně', 'Neomezeně', 'Neomezeně'] },
          { label: 'Kontrolované produkty', values: ['Neomezeně', 'Neomezeně', 'Neomezeně'] },
          { label: 'Samoobslužné nastavení produktů', values: ['✓', '✓', '✓'] },
          { label: 'Počítání kusů a statistiky', values: ['✓', '✓', '✓'] },
          { label: 'Prostoje a takt výroby', values: ['✓', '✓', '✓'] },
          {
            label: 'Pokročilá analytika (porovnání závodů, statistiky po kusech)',
            values: ['', '✓', '✓'],
          },
        ],
      },
      {
        label: 'Nasazení a podpora',
        rows: [
          { label: 'Dashboard na halu v reálném čase', values: ['✓', '✓', '✓'] },
          { label: 'Tréninky modelů', values: ['5 / měsíc', 'Neomezeně', 'Neomezeně'] },
          { label: 'Instalace a zaškolení na místě', values: ['', '✓', '✓'] },
          { label: 'PLC I/O (DI/DO, RS485, EtherCAT, Modbus)', values: ['', '✓', '✓'] },
          { label: 'Poinstalační servis a podpora', values: ['E-mail', 'Prioritní', '24/7 SLA'] },
          { label: 'Integrace ERP / MES', values: ['', '', '✓'] },
          { label: 'Modely a hardware na míru', values: ['', '', '✓'] },
        ],
      },
    ],
  }

  const comparisonEn = {
    heading: 'Compare plans',
    columns: ['Standard', 'Pro', 'Enterprise'],
    groups: [
      {
        label: 'Inspection',
        rows: [
          { label: 'Cameras & sites', values: ['Unlimited', 'Unlimited', 'Unlimited'] },
          { label: 'Inspected products', values: ['Unlimited', 'Unlimited', 'Unlimited'] },
          { label: 'Self-service product setup', values: ['✓', '✓', '✓'] },
          { label: 'Piece counting & statistics', values: ['✓', '✓', '✓'] },
          { label: 'Downtime & production takt', values: ['✓', '✓', '✓'] },
          {
            label: 'Advanced analytics (site comparisons, per-part stats)',
            values: ['', '✓', '✓'],
          },
        ],
      },
      {
        label: 'Deployment & support',
        rows: [
          { label: 'Real-time floor dashboard', values: ['✓', '✓', '✓'] },
          { label: 'Model trainings', values: ['5 / month', 'Unlimited', 'Unlimited'] },
          { label: 'On-site install & training', values: ['', '✓', '✓'] },
          { label: 'PLC I/O (DI/DO, RS485, EtherCAT, Modbus)', values: ['', '✓', '✓'] },
          { label: 'Post-install service & support', values: ['Email', 'Priority', '24/7 SLA'] },
          { label: 'ERP / MES integration', values: ['', '', '✓'] },
          { label: 'Custom models & hardware', values: ['', '', '✓'] },
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
          h1: 'Ceník, který roste s vaším provozem.',
          sub: 'Hardware, instalace i deep-learning inspekce v jedné předvídatelné měsíční ceně. Začněte s jednou kamerou a rozšiřujte, až budete připraveni.',
        },
        tableHeading: '',
        tiers: [
          {
            name: 'Standard',
            tagline: 'Ověřte si to na jedné kameře, než začnete škálovat.',
            price: '9 900 Kč',
            period: '/ kamera / měsíc',
            ctaLabel: 'Začít',
            ctaUrl: '/cs/kontakt?tier=standard',
            ctaVariant: 'outlined',
            features: [
              'Neomezený počet kamer a produktů',
              'Počítání kusů, statistiky a prostoje',
              'Samoobslužné nastavení produktů v aplikaci Studio',
              'Dashboard na halu v reálném čase — funguje na jakémkoli tabletu',
              '5 tréninků modelu měsíčně',
              'E-mailová podpora',
            ],
          },
          {
            name: 'Pro',
            badge: 'Nejoblíbenější',
            tagline: 'Kompletní kontrola kvality pro vaše nejvytíženější provozy.',
            price: '14 900 Kč',
            period: '/ kamera / měsíc',
            ctaLabel: 'Objednat demo',
            ctaUrl: '/cs/kontakt?tier=pro',
            ctaVariant: 'filled',
            highlighted: true,
            leadIn: 'Vše z plánu Standard a navíc',
            features: [
              'Pokročilá analytika (prostoje, porovnání závodů, statistiky po kusech)',
              'Neomezené tréninky modelů',
              'PLC s digitálními výstupy, RS485, EtherCAT a Modbus',
              'Instalace na místě a zaškolení operátorů',
              'Poinstalační servis a prioritní podpora',
            ],
          },
          {
            name: 'Enterprise',
            tagline: 'Nasazení napříč závody, zapojené do vašich systémů.',
            price: 'Individuálně',
            period: '',
            subNote: 'objemové ceny · vyhrazený success manažer',
            ctaLabel: 'Kontaktovat obchod',
            ctaUrl: '/cs/kontakt?tier=enterprise',
            ctaVariant: 'filled',
            leadIn: 'Vše z plánu Pro a navíc',
            features: ['Integrace ERP a MES', 'Modely a hardware na míru', 'SLA'],
          },
        ],
        footnote:
          'Všechny plány zahrnují hardware s krytím IP67 do umývaných provozů, OTA aktualizace a neomezený počet operátorů. Ceny bez DPH.',
        logoEyebrow: 'Důvěřují nám výrobní provozy a sklady po celé Evropě',
        comparison: comparisonCs,
        benefits: {
          heading: 'S plánem Pro jsou instalace a podpora na nás.',
          sub: 'Přijedeme do vašeho závodu, namontujeme utěsněnou kameru nad váš proces a všechno na místě nastavíme — a pak jsme vám dál k dispozici se servisem a podporou ještě dlouho po spuštění.',
          items: [
            {
              icon: 'IcoController',
              title: 'Přijedeme k vám',
              body: 'Instalace na místě v mokrých, chladných i prašných provozech — zapojená do systémů, které už používáte.',
            },
            {
              icon: 'IcoSupport',
              title: 'Poinstalační podpora',
              body: 'Průběžný servis, ladění a prioritní podpora v ceně od plánu Pro výš.',
            },
            {
              icon: 'IcoRefresh',
              title: 'Vždy aktuální',
              body: 'OTA aktualizace modelů i softwaru udrží inspekci přesnou, i když se vaše produkty mění.',
            },
          ],
        },
        faqHeading: 'Otázky k ceně, zodpovězené.',
        cta: {
          heading: 'Nevíte, který plán sedí?',
          sub: 'Objednejte si 30minutové demo a společně ho nastavíme podle vašeho provozu a produktů.',
          primary: 'Objednat demo',
          secondary: 'Kontaktovat obchod',
        },
      }),
      seo: {
        title: 'Ceník — plány vizuální inspekce Robopipe',
        description:
          'Ceník Robopipe: Standard 9 900 Kč, Pro 14 900 Kč za kameru měsíčně a Enterprise na míru. Utěsněný IP67 hardware, instalace na místě a deep-learning inspekce v jedné předvídatelné ceně.',
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
          h1: 'Pricing that scales with your operation.',
          sub: "Hardware, install and deep-learning inspection in one predictable monthly price. Start with one camera, roll out when you're ready.",
        },
        tableHeading: '',
        tiers: [
          {
            name: 'Standard',
            tagline: 'Prove it on one camera before you scale.',
            price: '€390',
            period: '/ camera / month',
            ctaLabel: 'Get started',
            ctaUrl: '/en/contact?tier=standard',
            ctaVariant: 'outlined',
            features: [
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
          'All plans include IP67 washdown-rated hardware, over-the-air updates and unlimited operators. Prices exclude VAT.',
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
          sub: 'Nasnímat, označit, natrénovat, vyhodnotit — stejná otevřená pipeline za každým nasazením, vyladěná podle toho, co vaše linka skutečně vyrábí, balí nebo expeduje.',
        },
        sections: [
          {
            anchor: 'food',
            chip: 'Potravinářství',
            heading: 'Potravinářství: kontrola každého kusu v tempu linky.',
            intro:
              'Od kompletace sendvičů po třídění ovoce — Robopipe kontroluje úplně každý produkt, který projde kolem kamery, ať už v umývaných zónách, chladírnách, nebo v moučném prachu.',
            bullets: [
              'Chybějící, špatně umístěné nebo záměněné suroviny na kompletovaných produktech',
              'Detekce cizích předmětů',
              'Kontrola porcí, odhad hmotnosti kamerou a úrovně naplnění',
              'Počítání kusů, úspěšnost a takt na displeji na hale',
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
            heading: 'Farmacie a zdravotnictví: ověřená plnění, uzávěry a etikety.',
            intro:
              'Plnění kapslí, blistrování a etiketování ověřené kus po kusu — s obrazovým záznamem každé kontroly pro vaši dokumentaci kvality.',
            bullets: [
              'Úroveň plnění, úplnost kapslí a blistrů',
              'Přítomnost a pozice víček, plomb a uzávěrů',
              'Přítomnost a orientace etikety, čitelnost kódu šarže',
              'Obrazový archiv všech OK i NOK kusů, exportovatelný pro audity',
            ],
            stats: [
              ['99,5 %', 'přesnost detekce'],
              ['100 %', 'kusů zdokumentováno'],
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
              'Ruční tagování tisíců produktových fotek je pomalé, nejednotné a náchylné k chybám — a špatná metadata pohřbí produkty ve vyhledávání. Robopipe čte vaše produktové fotky a tagy píše za vás, aby katalog zůstal prohledávatelný, i když roste.',
            bullets: [
              'Nové produkty zalistované z fotky — barva, materiál, velikost i styl rozpoznané automaticky',
              'Jednotná terminologie napříč celým katalogem — bez překlepů, opomenutí a míchaných štítků',
              'Lepší SEO a vyhledávání: „černá kožená kancelářská židle" najde správný produkt',
              'Zvládne sezónní kolekce i desítky tisíc SKU bez nutnosti najímat další lidi',
              'Pokryjeme i fulfilment: obsah objednávky ověříme a doložíme fotografií každé odeslané krabice',
              'Analýza regálů: digitalizované kontroly prodejen — fotky regálů automaticky vyhodnocené, aby zboží nikdy nechybělo na svém místě',
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
            heading: 'Logistika: bezpečnější a měřitelný sklad.',
            intro:
              'Kamery nepřetržitě sledují uličky, doky a dopravníky — hlásí bezpečnostní rizika v okamžiku vzniku a mění každý pohyb v provozní statistiky.',
            bullets: [
              'Skoronehody vysokozdvižných vozíků a chodců — detekované, počítané a mapované na riziková místa',
              'Chybějící OOPP (vesty, přilby) a neoprávněný vstup do zón pro vozíky',
              'Zablokované únikové východy, rozlité kapaliny a překážky v uličkách hlášené okamžitě',
              'Překračování rychlosti a jízda v protisměru zaznamenané podle vozíku a směny',
              'Heatmapy provozu, prostoje na docích a špičky — podklady pro změny layoutu',
              'Statistiky průchodnosti a skoronehod napojené do WMS a bezpečnostního reportingu',
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
          sub: 'Pokud to kamera vidí, Robopipe se to naučí. Napište nám, co vyrábíte, a ukážeme vám, jak by inspekce vypadala.',
          primary: 'Objednat demo',
          secondaryLabel: 'Případové studie',
          secondaryUrl: '/cs/case-studies',
        },
      }),
      seo: {
        title: 'Obory — strojové vidění pro potravinářství, farmacii, retail a logistiku | Robopipe',
        description:
          'Jak strojové vidění Robopipe řeší kontrolu kvality v potravinářství, farmacii a zdravotnictví, retailu a e-commerce i logistice — kusová inspekce, počítání, tagování a bezpečnost skladu.',
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

Web běží na infrastruktuře Google Cloud v EU. E-maily odesíláme přes službu Resend. Údaje neprodáváme ani nesdílíme pro marketing třetích stran.

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

The site runs on Google Cloud infrastructure in the EU. Emails are delivered via Resend. We do not sell your data or share it for third-party marketing.

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
      title: 'Robopipe — Vizuální kontrola kvality, která se naučí váš produkt',
      slug: 'home',
      layout: homeLayout({
        hero: {
          chip: 'Průmyslové strojové vidění',
          h1: 'AI vizuální kontrola, která se naučí váš produkt.',
          sub: 'Robopipe nasazuje deep-learning inspekci všude, kudy prochází vaše produkty — v potravinářských provozech, farmaceutickém balení, retailovém fulfillmentu i logistických skladech. Zachyťte vady v reálném čase. Bez datových vědců.',
          primary: 'Objednat demo',
          secondary: 'Zobrazit ceník',
        },
        trust: {
          label: 'Ověřeno v provozu:',
          items: ['3 600 produktů / hod', 'přesnost až 99,5 %', 'nasazení < 1 den'],
        },
        logoEyebrow: 'Důvěřují nám výrobní provozy a sklady po celé Evropě',
        features: {
          heading: 'Deep-learning inspekce, kterou zvládne váš vlastní tým.',
          sub: 'AI detekce vad navržená pro výrobní halu, ne pro laboratoř.',
          items: [
            {
              icon: 'IcoAddLarge',
              title: 'Samoobslužné nastavení',
              body: 'Nový produkt ke kontrole přidáte sami během minut. Vyfoťte pár správných kusů, potvrďte, jak vypadá „OK", a Robopipe začne kontrolovat — žádní inženýři, žádné tickety, žádné čekání.',
            },
            {
              icon: 'IcoChart',
              title: 'Monitoring výroby v reálném čase',
              body: 'Displej na hale ukazuje operátorům, jak běží dnešní šarže — počty kusů, úspěšnost, nejčastější vady, prostoje a takt, s okamžitou zpětnou vazbou, na kterou tým reaguje přímo u linky.',
            },
            {
              icon: 'IcoBox',
              title: 'Odolné i v nejnáročnějším provozu',
              body: 'Plně utěsněný hardware s krytím IP67 do umývaných provozů přežije páru, ostřik, prach i chladírny. Namontujte ho přímo nad linku a umyjte ho spolu se zbytkem haly.',
            },
            {
              icon: 'IcoConnector',
              title: 'Připojí se k čemukoli',
              body: 'Volitelný univerzální AI PLC kontrolér s analogovými i digitálními I/O, RS485/RS232, Modbus a EtherCAT po Ethernetu — zapojený do systémů, které už provozujete, včetně ERP a WMS.',
            },
          ],
        },
        industriesGrid: {
          heading: 'Připraveno předefinovat vaše odvětví.',
          sub: 'Stejná pipeline — nasnímat, označit, natrénovat, vyhodnotit — vyladěná pro čtyři úplně různé provozy.',
          exploreLabel: 'Prozkoumat',
          cards: [
            {
              title: 'Potravinářství',
              body: 'Vady, cizí předměty a kontrola porcí v rychlosti linky.',
              url: '/cs/obory#food',
              image: media.inspectionDetection,
            },
            {
              title: 'Farmacie a zdravotnictví',
              body: 'Ověření plnění, uzávěrů a etiket s kompletní auditní stopou.',
              url: '/cs/obory#pharma',
              image: media.pharmaHmi,
            },
            {
              title: 'Retail a e-commerce',
              body: 'Produktové fotky tagované AI — katalogy, které zůstanou prohledávatelné.',
              url: '/cs/obory#retail',
              image: media.retailPacking,
            },
            {
              title: 'Logistika',
              body: 'Bezpečnostní rizika hlášená živě, pohyby proměněné ve statistiky.',
              url: '/cs/obory#logistics',
              image: media.logisticsWarehouse,
            },
          ],
        },
        process: {
          heading: 'AI inspekce v provozu za jediný den.',
          sub: 'Žádní integrátoři, žádné dlouhé projekty. Váš tým to vlastní od prvního dne.',
          steps: [
            {
              title: 'Nainstalujeme u vás',
              body: 'Náš tým přijede do vašeho závodu nebo skladu, namontuje utěsněnou kameru nad linku a všechno na místě zprovozní — včetně mokrých, chladných a prašných provozů.',
            },
            {
              title: 'Přidejte svůj produkt',
              body: 'Nasnímejte dávku obrázků, označte je a natrénujte model — s průvodcem od začátku do konce, bez znalostí ML. Co projde, určujete vy.',
            },
            {
              title: 'Spusťte — s podporou',
              body: 'Operátoři vidí kvalitu na displeji na hale; manažeři sledují trendy v analytickém portálu. Zůstáváme k dispozici s poinstalačním servisem, kdykoli nás potřebujete.',
            },
          ],
          button: 'Objednat demo',
          stats: [
            ['< 1 den', 'do první inspekce'],
            ['IP67', 'krytí do umývaných provozů'],
            ['0', 'potřebných datových vědců'],
            ['24/7', 'monitoring'],
            ['✓', 'funguje offline'],
          ],
        },
        quote: {
          chip: 'Příběh zákazníka',
          exploreLabel: 'přečtěte si případovou studii',
          linkUrl: '/cs/case-studies',
        },
        split: { blogHeading: 'Z blogu', faqHeading: 'Otázky a odpovědi.' },
        cta: {
          heading: 'Podívejte se na AI kontrolu kvality na vlastních produktech.',
          sub: 'Objednejte si 30minutové demo a sledujte, jak deep-learning inspekce zachytí vady na vašem vlastním produktu.',
          button: 'Objednat demo',
        },
      }),
      seo: {
        title: 'Robopipe — Vizuální kontrola kvality, která se naučí váš produkt',
        description:
          'Robopipe nasazuje deep-learning vizuální inspekci v potravinářství, farmacii, retailu i logistice. Utěsněná IP67 kamera, samoobslužný trénink, živý dashboard na hale. Objednejte si demo.',
      },
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: homePage.id,
    locale: 'en',
    data: {
      title: 'Robopipe — Visual quality control that learns your product',
      slug: 'home',
      layout: homeLayout({
        hero: {
          chip: 'Industrial machine vision',
          h1: 'AI visual control that learns your product.',
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
        title: 'Robopipe — Visual quality control that learns your product',
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
        cta: bookDemo(loc === 'cs' ? 'Objednat demo' : 'Book a demo'),
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
            ? 'Deep-learning kontrola kvality pro průmyslové provozy.'
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
                  label: 'GitHub',
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
        title: 'Robopipe — Vizuální kontrola kvality, která se naučí váš produkt',
        description:
          'Deep-learning vizuální inspekce pro potravinářství, farmacii, retail a logistiku. Utěsněná IP67 kamera, samoobslužný trénink, živý dashboard na hale.',
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
        title: 'Robopipe — Visual quality control that learns your product',
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
