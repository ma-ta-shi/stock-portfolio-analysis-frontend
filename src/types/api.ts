export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  pages: number
}

export interface ListResponse<T> {
  data: T[]
  meta: PaginationMeta
}
