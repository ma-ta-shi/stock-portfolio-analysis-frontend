import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end checks against a real backend on a seeded scratch database (`npm run test:e2e`, scripts/e2e.mjs, which
 * starts both servers). Every page loads without errors in light and dark, the user flows work, and axe-core finds no
 * accessibility violations.
 */
const light = { ...devices['Desktop Chrome'], colorScheme: 'light' as const }

export default defineConfig({
  testDir: './e2e',
  // The specs change one database, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
  },
  // The page checks see the seed as it was built; everything else runs after them, once.
  projects: [
    { name: 'pages-light', testMatch: 'pages.spec.ts', use: light },
    { name: 'pages-dark', testMatch: 'pages.spec.ts', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'flows', testIgnore: 'pages.spec.ts', dependencies: ['pages-light', 'pages-dark'], use: light },
  ],
})
