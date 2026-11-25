import { defineConfig, devices } from '@playwright/test'

const PORT = 5179
/** `npm run test:e2e:live` (scripts/e2e-live.mjs) runs the specs in `e2e-live` against a real backend on a seeded scratch database. */
const LIVE = process.env.E2E_LIVE === '1'

/**
 * End-to-end checks against the real app in mock mode: every page loads without errors,
 * key user flows work, and axe-core finds no accessibility violations in light or dark mode.
 * Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: LIVE ? './e2e-live' : './e2e',
  // The live specs change one database, so they run one at a time.
  fullyParallel: !LIVE,
  workers: LIVE ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: LIVE ? process.env.E2E_BASE_URL : `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: LIVE
    ? [{ name: 'live', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } }]
    : [
        { name: 'light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
        { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
      ],
  webServer: LIVE
    ? undefined
    : {
        // Test the production build (what actually ships), in mock mode.
        command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
        port: PORT,
        reuseExistingServer: !process.env.CI,
        env: { VITE_USE_MOCK: 'true' },
        timeout: 120_000,
      },
})
