/**
 * The Feedback page against the seeded scratch backend. The scorecard folder is the backend's own and not seeded, so the
 * page is compared with whatever the API answers rather than with an assumed state.
 */
import { axeViolations, expect, test } from './fixtures'
import { API } from './helpers'

test('feedback: the batch, the scorecard state and the weekly batch predictions match the API', async ({ page, request }) => {
  const json = async (path: string) => (await request.get(`${API}${path}`)).json()
  const batch = await json('/api/weekly-batch')
  const predictions = await json('/api/predictions?current_design=true&page=1&per_page=20')
  expect(predictions.meta.total).toBeGreaterThan(0) // the seed holds one batch prediction
  const overview = await request.get(`${API}/api/scorecard?section=overview`)
  const versions = (await json('/api/pipeline-versions?per_page=100')).data

  await page.goto('/feedback')
  const progress = page.getByRole('region', { name: 'Progress' })
  await expect(progress).toContainText(`${batch.week.done} of ${batch.week.done + batch.week.pending + batch.week.gave_up} done`)
  if (overview.status() === 404) await expect(progress).toContainText('No scorecard has been saved yet')
  else {
    const version = (await overview.json()).data.current_cohort.split('-')[0]
    const current = versions[versions.length - 1].id
    // an older scorecard still counts when the newer versions have the same view
    await expect(progress).toContainText(version === current ? 'Toward a verdict' : /Toward a verdict|is for pipeline/)
  }
  await expect(page.getByRole('region', { name: 'Agent Accuracy' })).toContainText('Not scored yet')

  const first = predictions.data[0]
  await expect(page.getByRole('link', { name: first.stock.ticker })).toBeVisible()
  await page.getByRole('button', { name: /Show details of/ }).first().click()
  await expect(page.getByText('Predicted range')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await axeViolations(page)).toEqual([])
})
