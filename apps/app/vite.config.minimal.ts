import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '#app': path.resolve(__dirname, './app'),
      '#tests': path.resolve(__dirname, './tests'),
    },
  },
  test: {
    environment: 'node',
  }
})
