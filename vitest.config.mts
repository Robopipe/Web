import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Each int file boots its own Payload against the one local database, and in
    // dev Payload pushes the schema on connect. Run files one at a time so those
    // pushes cannot race (parallel workers fail on drops the other already did).
    fileParallelism: false,
  },
})
