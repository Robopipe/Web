import type { Block } from 'payload'

import { BlogTeaser } from './BlogTeaser/config'
import { CaseStudyGrid } from './CaseStudyGrid/config'
import { ContactForm } from './ContactForm/config'
import { Content } from './Content/config'
import { CTABanner } from './CTABanner/config'
import { FAQAccordion } from './FAQAccordion/config'
import { FeatureGrid } from './FeatureGrid/config'
import { Hero } from './Hero/config'
import { LogoCloud } from './LogoCloud/config'
import { MediaBlock } from './MediaBlock/config'
import { PricingTable } from './PricingTable/config'
import { Stats } from './Stats/config'
import { TestimonialBar } from './TestimonialBar/config'
import { UseCaseCards } from './UseCaseCards/config'

/** All blocks available in the page builder, in admin display order. */
export const pageBlocks: Block[] = [
  Hero,
  FeatureGrid,
  Content,
  MediaBlock,
  Stats,
  LogoCloud,
  TestimonialBar,
  UseCaseCards,
  PricingTable,
  FAQAccordion,
  CaseStudyGrid,
  BlogTeaser,
  CTABanner,
  ContactForm,
]
