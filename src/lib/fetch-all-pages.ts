import { apiFetch } from './api'
import type { ListResponse } from '@/types'

const PER_PAGE = 100 // the API's maximum

/**
 * Every row of a paged list: follows `meta.pages` with `per_page=100`. For a list the screen shows whole (holdings, the
 * rows of a CSV export). A list that can grow without bound is paged on screen instead, with `<Pager>`.
 */
export async function fetchAllPages<T>(mockPath: string, apiPath: string, options: RequestInit = {}): Promise<T[]> {
  const rows: T[] = []
  const joiner = apiPath.includes('?') ? '&' : '?'
  for (let page = 1; ; page++) {
    const res = await apiFetch<ListResponse<T>>(mockPath, `${apiPath}${joiner}page=${page}&per_page=${PER_PAGE}`, options)
    rows.push(...res.data)
    if (page >= res.meta.pages) return rows
  }
}
