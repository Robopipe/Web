import * as migration_20260721_095938_initial from './20260721_095938_initial';

export const migrations = [
  {
    up: migration_20260721_095938_initial.up,
    down: migration_20260721_095938_initial.down,
    name: '20260721_095938_initial'
  },
];
