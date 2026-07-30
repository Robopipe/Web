import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import React from 'react'

import { PostCard } from '@/components/PostCard'
import type { Locale } from '@/i18n/routing'
import { getPosts } from '@/lib/queries'
import type { SplitSectionBlock } from '@/payload-types'

import { FAQList } from '../FAQAccordion/Component'

export const SplitSectionComponent: React.FC<SplitSectionBlock> = async ({ blog, faq }) => {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('blog')
  const posts = await getPosts(locale, { limit: blog?.limit ?? 2 })
  const faqItems = (faq?.faqs ?? []).filter(
    (f): f is Exclude<typeof f, number> => typeof f !== 'number',
  )

  return (
    <section className="container-site py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          {blog?.heading && <h3 className="mb-8">{blog.heading}</h3>}
          <div className="flex flex-col gap-5">
            {posts.docs.map((post) => (
              <PostCard key={post.id} post={post} variant="horizontal" />
            ))}
          </div>
          <Link
            href={`/${locale}/blog`}
            className="mt-6 inline-block text-sm font-semibold text-brand-fg hover:text-brand-fg-hover"
          >
            {t('allPosts')} →
          </Link>
        </div>
        <div>
          {faq?.heading && <h3 className="mb-8">{faq.heading}</h3>}
          {faqItems.length > 0 && <FAQList items={faqItems} />}
        </div>
      </div>
    </section>
  )
}
