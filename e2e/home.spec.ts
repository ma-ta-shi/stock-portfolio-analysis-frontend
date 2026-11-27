/** Home against the seeded scratch backend: the cards and market figures are what the API answers. */
import { axeViolations, expect, test } from './fixtures'
import { API } from './helpers'

test('home: the activity cards and the market figures match the API', async ({ page, request }) => {
  const json = async (path: string) => (await request.get(`${API}${path}`)).json()
  const user = (await json('/api/users')).data[0].user_id
  const feed = await json(`/api/activity?user_id=${user}&per_page=100`)
  const macro = await json('/api/macro')

  await page.goto('/')
  const changed = page.getByRole('region', { name: 'What Changed' })
  if (feed.data.length === 0) await expect(changed).toContainText('Nothing new in the last 7 days.')
  else {
    await expect(changed.getByRole('listitem')).toHaveCount(Math.min(8, feed.data.length))
    await expect(changed.getByRole('listitem').first()).toContainText(feed.data[0].title)
  }
  const market = page.getByRole('region', { name: 'Market Overview' })
  await expect(market).toContainText(macro.run_id === null ? 'No analysis on record yet' : 'from the analysis of')
  if (macro.boc_rate != null) await expect(market).toContainText(`${macro.boc_rate.toFixed(2)}%`)
  await expect(page.getByRole('img', { name: 'Notifications are not counted yet' })).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
})
