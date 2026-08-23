import * as migration_20260821_140628_initial from './20260821_140628_initial'

export const migrations = [
  {
    up: migration_20260821_140628_initial.up,
    down: migration_20260821_140628_initial.down,
    name: '20260821_140628_initial',
  },
]
