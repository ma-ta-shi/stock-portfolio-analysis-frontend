import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { test as base, expect, type Page } from '@playwright/test'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

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
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    await provide(errors)
    expect(errors, 'console errors').toEqual([])
  },
})

export { expect }
