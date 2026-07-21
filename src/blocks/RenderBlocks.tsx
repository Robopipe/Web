import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { BlogTeaserComponent } from './BlogTeaser/Component'
import { CaseStudyGridComponent } from './CaseStudyGrid/Component'
import { ContactFormComponent } from './ContactForm/Component'
import { ContentComponent } from './Content/Component'
import { CTABannerComponent } from './CTABanner/Component'
import { FAQAccordionComponent } from './FAQAccordion/Component'
import { FeatureGridComponent } from './FeatureGrid/Component'
import { HeroComponent } from './Hero/Component'
import { LogoCloudComponent } from './LogoCloud/Component'
import { MediaBlockComponent } from './MediaBlock/Component'
import { PricingTableComponent } from './PricingTable/Component'
import { StatsComponent } from './Stats/Component'
import { TestimonialBarComponent } from './TestimonialBar/Component'
import { UseCaseCardsComponent } from './UseCaseCards/Component'

type LayoutBlock = NonNullable<Page['layout']>[number]

/* eslint-disable @typescript-eslint/no-explicit-any -- block props are narrowed by blockType */
const components: Record<LayoutBlock['blockType'], React.FC<any>> = {
  hero: HeroComponent,
  featureGrid: FeatureGridComponent,
  content: ContentComponent,
  mediaBlock: MediaBlockComponent,
  stats: StatsComponent,
  logoCloud: LogoCloudComponent,
  testimonialBar: TestimonialBarComponent,
  useCaseCards: UseCaseCardsComponent,
  pricingTable: PricingTableComponent,
  faqAccordion: FAQAccordionComponent,
  caseStudyGrid: CaseStudyGridComponent,
  blogTeaser: BlogTeaserComponent,
  ctaBanner: CTABannerComponent,
  contactForm: ContactFormComponent,
}

export const RenderBlocks: React.FC<{ blocks: Page['layout'] | null | undefined }> = ({
  blocks,
}) => {
  if (!blocks?.length) return null
  return (
    <Fragment>
      {blocks.map((block) => {
        const Component = components[block.blockType]
        if (!Component) return null
        return <Component key={block.id ?? block.blockType} {...block} />
      })}
    </Fragment>
  )
}
