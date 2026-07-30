import * as migration_20260728_102633_initial from './20260728_102633_initial';
import * as migration_20260730_112326_ai_blog_generation from './20260730_112326_ai_blog_generation';

export const migrations = [
  {
    up: migration_20260728_102633_initial.up,
    down: migration_20260728_102633_initial.down,
    name: '20260728_102633_initial',
  },
  {
    up: migration_20260730_112326_ai_blog_generation.up,
    down: migration_20260730_112326_ai_blog_generation.down,
    name: '20260730_112326_ai_blog_generation'
  },
];
