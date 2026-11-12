import * as migration_20260728_102633_initial from './20260728_102633_initial'
import * as migration_20260730_112326_ai_blog_generation from './20260730_112326_ai_blog_generation'
import * as migration_20260827_110245_add_contact_booking from './20260827_110245_add_contact_booking'
import * as migration_20261110_180954_seo_geo from './20261110_180954_seo_geo'
import * as migration_20261110_212327_seo_geo_stage2 from './20261110_212327_seo_geo_stage2'
import * as migration_20261111_111049_feature_grid_link from './20261111_111049_feature_grid_link'
import * as migration_20261111_121632_case_study_metric_listing from './20261111_121632_case_study_metric_listing'
import * as migration_20261111_135405_case_study_metric_drop_listing from './20261111_135405_case_study_metric_drop_listing'
import * as migration_20261111_151806_hero_video_localized from './20261111_151806_hero_video_localized'
import * as migration_20261111_164405_industry_card_image_localized from './20261111_164405_industry_card_image_localized'
import * as migration_20261111_181546_site_settings_measurement from './20261111_181546_site_settings_measurement'
import * as migration_20261111_213459_service_video from './20261111_213459_service_video'
import * as migration_20261111_220539_leads_attribution from './20261111_220539_leads_attribution'
import * as migration_20261112_071955_ads_export_credentials from './20261112_071955_ads_export_credentials'
import * as migration_20261112_084552_hero_mobile_video from './20261112_084552_hero_mobile_video'

export const migrations = [
  {
    up: migration_20260728_102633_initial.up,
    down: migration_20260728_102633_initial.down,
    name: '20260728_102633_initial',
  },
  {
    up: migration_20260730_112326_ai_blog_generation.up,
    down: migration_20260730_112326_ai_blog_generation.down,
    name: '20260730_112326_ai_blog_generation',
  },
  {
    up: migration_20260827_110245_add_contact_booking.up,
    down: migration_20260827_110245_add_contact_booking.down,
    name: '20260827_110245_add_contact_booking',
  },
  {
    up: migration_20261110_180954_seo_geo.up,
    down: migration_20261110_180954_seo_geo.down,
    name: '20261110_180954_seo_geo',
  },
  {
    up: migration_20261110_212327_seo_geo_stage2.up,
    down: migration_20261110_212327_seo_geo_stage2.down,
    name: '20261110_212327_seo_geo_stage2',
  },
  {
    up: migration_20261111_111049_feature_grid_link.up,
    down: migration_20261111_111049_feature_grid_link.down,
    name: '20261111_111049_feature_grid_link',
  },
  {
    up: migration_20261111_121632_case_study_metric_listing.up,
    down: migration_20261111_121632_case_study_metric_listing.down,
    name: '20261111_121632_case_study_metric_listing',
  },
  {
    up: migration_20261111_135405_case_study_metric_drop_listing.up,
    down: migration_20261111_135405_case_study_metric_drop_listing.down,
    name: '20261111_135405_case_study_metric_drop_listing',
  },
  {
    up: migration_20261111_151806_hero_video_localized.up,
    down: migration_20261111_151806_hero_video_localized.down,
    name: '20261111_151806_hero_video_localized',
  },
  {
    up: migration_20261111_164405_industry_card_image_localized.up,
    down: migration_20261111_164405_industry_card_image_localized.down,
    name: '20261111_164405_industry_card_image_localized',
  },
  {
    up: migration_20261111_181546_site_settings_measurement.up,
    down: migration_20261111_181546_site_settings_measurement.down,
    name: '20261111_181546_site_settings_measurement',
  },
  {
    up: migration_20261111_213459_service_video.up,
    down: migration_20261111_213459_service_video.down,
    name: '20261111_213459_service_video',
  },
  {
    up: migration_20261111_220539_leads_attribution.up,
    down: migration_20261111_220539_leads_attribution.down,
    name: '20261111_220539_leads_attribution',
  },
  {
    up: migration_20261112_071955_ads_export_credentials.up,
    down: migration_20261112_071955_ads_export_credentials.down,
    name: '20261112_071955_ads_export_credentials',
  },
  {
    up: migration_20261112_084552_hero_mobile_video.up,
    down: migration_20261112_084552_hero_mobile_video.down,
    name: '20261112_084552_hero_mobile_video',
  },
]
