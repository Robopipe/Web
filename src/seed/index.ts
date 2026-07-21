import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Development/staging seed: admin user, globals, home + pricing + contact + about pages,
 * one use-case page, categories, an author, FAQs, a testimonial, a case study and two posts —
 * all in both locales. Idempotent-ish: skips when a home page already exists.
 *
 * Run with: pnpm seed
 */
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

  // --- Blog taxonomy + author ---
  const category = await payload.create({
    collection: 'categories',
    data: { title: 'Novinky', slug: 'novinky' },
  })
  await payload.update({
    collection: 'categories',
    id: category.id,
    locale: 'en',
    data: { title: 'News', slug: 'news' },
  })

  const author = await payload.create({
    collection: 'authors',
    data: { name: 'Robopipe Team', role: 'Tým Robopipe' },
  })

  // --- FAQs ---
  const faqData = [
    {
      cs: {
        q: 'Potřebuje Robopipe připojení k internetu?',
        a: 'Ne. Veškerá inference běží přímo na zařízení (4 TOPs), takže systém funguje zcela offline.',
      },
      en: {
        q: 'Does Robopipe need an internet connection?',
        a: 'No. All inference runs directly on the device (4 TOPs), so the system works fully offline.',
      },
    },
    {
      cs: {
        q: 'Jak se Robopipe integruje do stávající výroby?',
        a: 'Kontrolér nabízí analogové i digitální vstupy/výstupy, RS485/RS232, Ethernet s podporou Modbus a EtherCAT.',
      },
      en: {
        q: 'How does Robopipe integrate with existing production?',
        a: 'The controller offers analog and digital I/O, RS485/RS232, and Ethernet with Modbus and EtherCAT support.',
      },
    },
  ]

  const richText = (text: string) => ({
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', text, version: 1 }],
        },
      ],
      direction: null,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  })

  const faqIds: number[] = []
  for (const faq of faqData) {
    const doc = await payload.create({
      collection: 'faqs',
      data: { question: faq.cs.q, answer: richText(faq.cs.a) },
    })
    await payload.update({
      collection: 'faqs',
      id: doc.id,
      locale: 'en',
      data: { question: faq.en.q, answer: richText(faq.en.a) },
    })
    faqIds.push(doc.id)
  }

  // --- Testimonial ---
  const testimonial = await payload.create({
    collection: 'testimonials',
    data: {
      quote:
        'Nasazení Robopipe nám snížilo počet reklamací o desítky procent během prvního kvartálu.',
      personName: 'Jan Novák',
      personRole: 'Vedoucí výroby',
      company: 'Ukázková výroba s.r.o.',
    },
  })
  await payload.update({
    collection: 'testimonials',
    id: testimonial.id,
    locale: 'en',
    data: {
      quote: 'Deploying Robopipe cut our defect claims by double-digit percentages in the first quarter.',
      personRole: 'Head of Production',
    },
  })

  // --- Case study ---
  const caseStudy = await payload.create({
    collection: 'case-studies',
    data: {
      title: 'Kontrola lahví ve stáčírně',
      slug: 'kontrola-lahvi-ve-stacirne',
      customer: 'Ukázková stáčírna',
      industry: 'Procesní výroba',
      excerpt: 'Automatická vizuální kontrola plnění a etiket při rychlosti linky 120 lahví za minutu.',
      metrics: [
        { value: '99.7%', label: 'přesnost detekce vad' },
        { value: '120/min', label: 'rychlost linky' },
      ],
      content: richText(
        'Zákazník potřeboval nahradit manuální vizuální kontrolu lahví. Robopipe kit byl nasazen přímo na lince a natrénován na detekci vadného plnění a poškozených etiket.',
      ),
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'case-studies',
    id: caseStudy.id,
    locale: 'en',
    data: {
      title: 'Bottle inspection in a bottling plant',
      slug: 'bottle-inspection-bottling-plant',
      industry: 'Process manufacturing',
      excerpt: 'Automated visual inspection of fill levels and labels at a line speed of 120 bottles per minute.',
      metrics: [
        { value: '99.7%', label: 'defect detection accuracy' },
        { value: '120/min', label: 'line speed' },
      ],
      content: richText(
        'The customer needed to replace manual visual inspection of bottles. The Robopipe kit was deployed directly on the line and trained to detect faulty fills and damaged labels.',
      ),
      _status: 'published',
    },
  })

  // --- Blog posts ---
  const posts = [
    {
      cs: {
        title: 'Představujeme Robopipe blog',
        slug: 'predstavujeme-robopipe-blog',
        excerpt: 'Novinky, návody a poznatky ze světa průmyslové strojové vize na jednom místě.',
        content:
          'Vítejte na blogu Robopipe. Budeme zde sdílet novinky o produktu, návody k nasazení a poznatky z praxe průmyslové strojové vize.',
      },
      en: {
        title: 'Introducing the Robopipe blog',
        slug: 'introducing-the-robopipe-blog',
        excerpt: 'News, guides and insights from industrial machine vision, all in one place.',
        content:
          'Welcome to the Robopipe blog. We will share product news, deployment guides and hands-on insights from industrial machine vision.',
      },
    },
    {
      cs: {
        title: 'Jak funguje detekce vad bez připojení k internetu',
        slug: 'detekce-vad-offline',
        excerpt: 'Proč běží inference přímo na zařízení a co to znamená pro vaši výrobu.',
        content:
          'Robopipe zpracovává obraz přímo na zařízení s výkonem 4 TOPs. Data nikdy neopouští vaši síť, odezva je v milisekundách a výpadek konektivity výrobu nezastaví.',
      },
      en: {
        title: 'How defect detection works without an internet connection',
        slug: 'offline-defect-detection',
        excerpt: 'Why inference runs on-device and what that means for your production.',
        content:
          'Robopipe processes images directly on the device with 4 TOPs of compute. Data never leaves your network, latency stays in milliseconds, and a connectivity outage never stops production.',
      },
    },
  ]

  for (const post of posts) {
    const doc = await payload.create({
      collection: 'posts',
      data: {
        title: post.cs.title,
        slug: post.cs.slug,
        excerpt: post.cs.excerpt,
        content: richText(post.cs.content),
        authors: [author.id],
        categories: [category.id],
        publishedAt: new Date().toISOString(),
        _status: 'published',
      },
    })
    await payload.update({
      collection: 'posts',
      id: doc.id,
      locale: 'en',
      data: {
        title: post.en.title,
        slug: post.en.slug,
        excerpt: post.en.excerpt,
        content: richText(post.en.content),
        _status: 'published',
      },
    })
  }

  // --- Pages ---
  const contactPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Kontakt',
      slug: 'kontakt',
      layout: [
        {
          blockType: 'contactForm',
          heading: 'Poptejte Robopipe',
          text: 'Napište nám, s čím potřebujete pomoci, a ozveme se vám do jednoho pracovního dne.',
          showUseCase: true,
        },
      ],
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
      layout: [
        {
          blockType: 'contactForm',
          heading: 'Get in touch',
          text: 'Tell us what you need and we will get back to you within one business day.',
          showUseCase: true,
        },
      ],
      _status: 'published',
    },
  })

  const pricingPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Ceník',
      slug: 'cenik',
      layout: [
        {
          blockType: 'pricingTable',
          heading: 'Ceník',
          text: 'Transparentní ceny. Pro větší nasazení připravíme individuální nabídku.',
          tiers: [
            {
              name: 'Robopipe Kit',
              price: 'od 74 900 Kč',
              period: 'za sadu',
              description: 'AI kamera, kontrolér a software pro jedno inspekční stanoviště.',
              features: [
                { text: '12MP senzor + stereo hloubka' },
                { text: 'Offline inference 4 TOPs' },
                { text: 'IP65, průmyslové provedení' },
              ],
              cta: { label: 'Poptat', type: 'internal' as const, page: contactPage.id },
              highlighted: true,
            },
            {
              name: 'Enterprise',
              price: 'Individuální',
              description: 'Více linek, integrace na míru, SLA podpora.',
              features: [{ text: 'Vše z Robopipe Kit' }, { text: 'Prioritní podpora' }],
              cta: { label: 'Kontaktujte nás', type: 'internal' as const, page: contactPage.id },
            },
          ],
          footnote: 'Ceny bez DPH.',
        },
        {
          blockType: 'faqAccordion',
          heading: 'Časté dotazy',
          faqs: faqIds,
        },
      ],
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
      layout: [
        {
          blockType: 'pricingTable',
          heading: 'Pricing',
          text: 'Transparent pricing. For larger deployments we prepare an individual quote.',
          tiers: [
            {
              name: 'Robopipe Kit',
              price: 'from €2,990',
              period: 'per kit',
              description: 'AI camera, controller and software for one inspection station.',
              features: [
                { text: '12MP sensor + stereo depth' },
                { text: 'Offline inference, 4 TOPs' },
                { text: 'IP65 industrial build' },
              ],
              cta: { label: 'Request a quote', type: 'internal' as const, page: contactPage.id },
              highlighted: true,
            },
            {
              name: 'Enterprise',
              price: 'Individual',
              description: 'Multiple lines, custom integrations, SLA support.',
              features: [{ text: 'Everything in Robopipe Kit' }, { text: 'Priority support' }],
              cta: { label: 'Contact us', type: 'internal' as const, page: contactPage.id },
            },
          ],
          footnote: 'Prices exclude VAT.',
        },
        {
          blockType: 'faqAccordion',
          heading: 'Frequently asked questions',
          faqs: faqIds,
        },
      ],
      _status: 'published',
    },
  })

  const aboutPage = await payload.create({
    collection: 'pages',
    data: {
      title: 'O nás',
      slug: 'o-nas',
      layout: [
        {
          blockType: 'content',
          width: 'narrow' as const,
          content: richText(
            'Robopipe vyvíjí tým KOALA42. Naším cílem je zpřístupnit průmyslovou strojovou vizi každé výrobě — bez závislosti na cloudu a bez armády integrátorů.',
          ),
        },
      ],
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: aboutPage.id,
    locale: 'en',
    data: {
      title: 'About us',
      slug: 'about',
      layout: [
        {
          blockType: 'content',
          width: 'narrow' as const,
          content: richText(
            'Robopipe is built by the KOALA42 team. Our goal is to make industrial machine vision accessible to every factory — with no cloud dependency and no army of integrators.',
          ),
        },
      ],
      _status: 'published',
    },
  })

  const homePage = await payload.create({
    collection: 'pages',
    data: {
      title: 'Robopipe — průmyslová strojová vize',
      slug: 'home',
      layout: [
        {
          blockType: 'hero',
          eyebrow: 'Průmyslová strojová vize',
          heading: 'Nasnímej, označ, natrénuj a řiď',
          text: 'Ušetřete čas i peníze rychlou a přesnou vizuální inspekcí přímo na výrobní lince — bez připojení k internetu.',
          links: [
            { link: { label: 'Poptat Robopipe', type: 'internal' as const, page: contactPage.id } },
            { link: { label: 'Ceník', type: 'internal' as const, page: pricingPage.id } },
          ],
          variant: 'centered' as const,
        },
        {
          blockType: 'stats',
          items: [
            { value: '12MP', label: 'senzor s hloubkovým viděním' },
            { value: '4 TOPs', label: 'výkon pro offline inferenci' },
            { value: 'IP65', label: 'průmyslové krytí' },
            { value: '<10 ms', label: 'odezva na lince' },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Co Robopipe umí',
          columns: '3' as const,
          features: [
            { title: 'Detekce a počítání objektů', text: 'Spolehlivá detekce dílů a produktů v reálném čase.' },
            { title: 'Detekce vad', text: 'Odhalení vadných kusů dřív, než opustí linku.' },
            { title: 'OCR a čtení kódů', text: 'Čtení textu, čárových a QR kódů i za zhoršených podmínek.' },
            { title: 'Navádění a pozicování', text: 'Přesné vedení robotů a manipulátorů.' },
            { title: 'Stereo hloubka', text: 'Aktivní stereo vidění pro 3D kontrolu.' },
            { title: 'Noční vidění', text: 'IR přísvit pro provoz bez okolního osvětlení.' },
          ],
        },
        {
          blockType: 'testimonialBar',
          testimonials: [testimonial.id],
        },
        {
          blockType: 'blogTeaser',
          limit: 3,
        },
        {
          blockType: 'ctaBanner',
          heading: 'Připraveni zpřesnit vaši výrobu?',
          text: 'Ozvěte se nám — do jednoho pracovního dne se vám ozve technik, ne obchodník.',
          link: { label: 'Poptat Robopipe', type: 'internal' as const, page: contactPage.id },
        },
      ],
      _status: 'published',
    },
  })
  await payload.update({
    collection: 'pages',
    id: homePage.id,
    locale: 'en',
    data: {
      title: 'Robopipe — industrial machine vision',
      slug: 'home',
      layout: [
        {
          blockType: 'hero',
          eyebrow: 'Industrial machine vision',
          heading: 'Capture, Label, Train & Control',
          text: 'Save time and money with fast, precise visual inspection right on the production line — no internet connection required.',
          links: [
            { link: { label: 'Request a quote', type: 'internal' as const, page: contactPage.id } },
            { link: { label: 'Pricing', type: 'internal' as const, page: pricingPage.id } },
          ],
          variant: 'centered' as const,
        },
        {
          blockType: 'stats',
          items: [
            { value: '12MP', label: 'sensor with depth perception' },
            { value: '4 TOPs', label: 'on-device inference power' },
            { value: 'IP65', label: 'industrial-grade rating' },
            { value: '<10 ms', label: 'response on the line' },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'What Robopipe does',
          columns: '3' as const,
          features: [
            { title: 'Object detection & counting', text: 'Reliable real-time detection of parts and products.' },
            { title: 'Defect detection', text: 'Catch faulty pieces before they leave the line.' },
            { title: 'OCR & code reading', text: 'Read text, barcodes and QR codes even in poor conditions.' },
            { title: 'Guiding & positioning', text: 'Precise guidance for robots and manipulators.' },
            { title: 'Stereo depth', text: 'Active stereo vision for 3D inspection.' },
            { title: 'Night vision', text: 'IR illumination for operation without ambient light.' },
          ],
        },
        {
          blockType: 'testimonialBar',
          testimonials: [testimonial.id],
        },
        {
          blockType: 'blogTeaser',
          limit: 3,
        },
        {
          blockType: 'ctaBanner',
          heading: 'Ready to make your production more precise?',
          text: 'Get in touch — an engineer, not a salesperson, will reply within one business day.',
          link: { label: 'Request a quote', type: 'internal' as const, page: contactPage.id },
        },
      ],
      _status: 'published',
    },
  })

  // --- Globals ---
  await payload.updateGlobal({
    slug: 'header',
    data: {
      navItems: [
        { link: { label: 'Ceník', type: 'internal' as const, page: pricingPage.id } },
        { link: { label: 'O nás', type: 'internal' as const, page: aboutPage.id } },
        { link: { label: 'Blog', type: 'external' as const, url: '/cs/blog' } },
        { link: { label: 'Dokumentace', type: 'external' as const, url: 'https://docs.robopipe.io', newTab: true } },
      ],
      cta: { link: { label: 'Poptat', type: 'internal' as const, page: contactPage.id } },
    },
  })
  await payload.updateGlobal({
    slug: 'header',
    locale: 'en',
    data: {
      navItems: [
        { link: { label: 'Pricing', type: 'internal' as const, page: pricingPage.id } },
        { link: { label: 'About', type: 'internal' as const, page: aboutPage.id } },
        { link: { label: 'Blog', type: 'external' as const, url: '/en/blog' } },
        { link: { label: 'Documentation', type: 'external' as const, url: 'https://docs.robopipe.io', newTab: true } },
      ],
      cta: { link: { label: 'Get a quote', type: 'internal' as const, page: contactPage.id } },
    },
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Robopipe',
      leadNotificationEmail: 'sales@robopipe.io',
      contactEmail: 'info@robopipe.io',
      defaultSeo: {
        title: 'Robopipe — průmyslová strojová vize',
        description:
          'AI vizuální inspekce pro výrobu: nasnímej, označ, natrénuj a řiď. Offline, průmyslové provedení IP65.',
      },
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      defaultSeo: {
        title: 'Robopipe — industrial machine vision',
        description:
          'AI visual inspection for manufacturing: capture, label, train and control. Offline, industrial IP65 build.',
      },
    },
  })

  payload.logger.info('Seed complete. Admin login: admin@robopipe.io / admin')
  process.exit(0)
}

void seed()
