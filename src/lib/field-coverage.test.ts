/**
 * Field coverage for every screen wired to the API (see `lib/fields.ts`): each property of each schema a screen reads is
 * shown or listed as not shown, with a reason. `npm run coverage:api` runs only the last test, which prints the response
 * schemas no screen has claimed yet; the epic is done when that list is empty or every entry has a reason.
 */
import { describe, expect, it } from 'vitest'
import apiFields from '@/types/api-fields.gen.json'
import { checkScreen, unclaimedSchemas, type ApiFieldsFile } from './fields'
import { GAPS } from './gaps'
import { SCREEN_FIELD_SETS } from '@/screens'

const api = apiFields as ApiFieldsFile
const gapIds = new Set(Object.keys(GAPS))

describe('field coverage', () => {
  it('has every screen decide every property of the schemas it reads', () => {
    const problems = SCREEN_FIELD_SETS.flatMap((set) => checkScreen(set, api, gapIds))
    expect(problems).toEqual([])
  })

  it('claims a schema in at most one screen, so no field is decided twice with two answers', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const set of SCREEN_FIELD_SETS) {
      for (const schema of set.schemas) {
        const first = owner.get(schema)
        if (first && first !== set.screen) clashes.push(`${schema}: ${first} and ${set.screen}`)
        owner.set(schema, set.screen)
      }
    }
    // A schema two screens both show (for example the stock snapshot) belongs to the shared mapper's screen and the
    // others list it in `notShown` or reuse its registry; a clash here means two registries answer for it separately.
    expect(clashes).toEqual([])
  })

  it('reports the response schemas no screen has claimed yet', () => {
    const unclaimed = unclaimedSchemas(SCREEN_FIELD_SETS, api)
    console.info(`${unclaimed.length} of ${api.responses.length} response schemas are not claimed by a screen yet:\n${unclaimed.join('\n')}`)
    expect(Array.isArray(unclaimed)).toBe(true)
  })
})
