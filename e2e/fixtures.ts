import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { test as base, expect, type Page } from '@playwright/test'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

/**
 * In the live run, screens that are not wired yet (the header bell, Home) still ask for routes the backend does not have and log a
 * 404. Those routes are the contract test's known-dead list (`src/lib/known-dead-routes.json`), so the allowance shrinks as the
 * page tickets land; any other console error still fails the test.
 */
const KNOWN_DEAD = (JSON.parse(readFileSync(new URL('../src/lib/known-dead-routes.json', import.meta.url), 'utf8')) as string[]).map(
  (route) => new RegExp(`^${route.split(' ')[1].replace(/\{\}/g, '[^/]+')}$`),
)
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname
  } catch {
    return '' // a console message with no address is never a known-dead route
  }
}
const isKnownDead404 = (text: string, url: string) =>
  process.env.E2E_LIVE === '1' && text.includes('status of 404') && KNOWN_DEAD.some((pattern) => pattern.test(pathOf(url)))

/** Run axe-core on the current page state and return readable violations. */
export async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: axeSource })
  // Evaluated in the browser; passed as a string so this Node-side file needs no DOM types.
  return page.evaluate<string[]>(`
    axe.run(document).then(({ violations }) =>
      violations.map((v) => v.id + ': ' + v.help + ' — ' + v.nodes.map((n) => n.target.join(' ')).join(', '))
    )
  `)
}

/** Page fixture that fails the test on any console error or uncaught exception. */
export const test = base.extend<{ consoleErrors: string[] }>({
  // (Playwright's fixture callback is named `provide` here so the React Hooks lint rule
  // doesn't mistake it for React's use().)
  consoleErrors: async ({ page }, provide) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' && !isKnownDead404(m.text(), m.location().url)) errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    await provide(errors)
    expect(errors, 'console errors').toEqual([])
  },
})

export { expect }
