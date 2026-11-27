import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Unit/component tests only; Playwright specs in e2e/ run via `npm run test:e2e`.
    include: ['src/**/*.test.{ts,tsx}'],
    // Users are in Canada; a UTC test runner would hide off-by-one-day bugs.
    // The backend address is forced empty so a developer's `.env` cannot change what a test asks for.
    env: { TZ: 'America/Toronto', VITE_API_BASE_URL: '' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
