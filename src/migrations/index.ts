import * as migration_20260728_102633_initial from './20260728_102633_initial';

export const migrations = [
  {
    up: migration_20260728_102633_initial.up,
    down: migration_20260728_102633_initial.down,
    name: '20260728_102633_initial'
  },
];
