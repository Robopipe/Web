import type { Block } from 'payload'

import { BlogTeaser } from './BlogTeaser/config'
import { CaseStudyGrid } from './CaseStudyGrid/config'
import { ContactForm } from './ContactForm/config'
import { Content } from './Content/config'
import { CTABanner } from './CTABanner/config'
import { FAQAccordion } from './FAQAccordion/config'
import { FeatureGrid } from './FeatureGrid/config'
import { Hero } from './Hero/config'
import { IndustryCards } from './IndustryCards/config'
import { IndustrySection } from './IndustrySection/config'
import { LogoCloud } from './LogoCloud/config'
import { MediaBlock } from './MediaBlock/config'
import { PlanComparison } from './PlanComparison/config'
import { PricingTable } from './PricingTable/config'
import { ProcessSteps } from './ProcessSteps/config'
import { SplitSection } from './SplitSection/config'
import { Stats } from './Stats/config'
import { TestimonialBar } from './TestimonialBar/config'

/** All blocks available in the page builder, in admin display order. */
export const pageBlocks: Block[] = [
  Hero,
  FeatureGrid,
  Content,
  MediaBlock,
  Stats,
  LogoCloud,
  TestimonialBar,
  IndustryCards,
  IndustrySection,
  ProcessSteps,
  PricingTable,
  PlanComparison,
  FAQAccordion,
  SplitSection,
  CaseStudyGrid,
  BlogTeaser,
  CTABanner,
  ContactForm,
]
