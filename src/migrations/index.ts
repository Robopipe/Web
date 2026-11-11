import * as migration_20260728_102633_initial from './20260728_102633_initial';
import * as migration_20260730_112326_ai_blog_generation from './20260730_112326_ai_blog_generation';
import * as migration_20260827_110245_add_contact_booking from './20260827_110245_add_contact_booking';
import * as migration_20261110_180954_seo_geo from './20261110_180954_seo_geo';
import * as migration_20261110_212327_seo_geo_stage2 from './20261110_212327_seo_geo_stage2';

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
    name: '20261110_212327_seo_geo_stage2'
  },
];
