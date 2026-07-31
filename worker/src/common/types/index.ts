export type Pagination = { page: number; limit: number }

export type ApiResponse<T> = {
  data: T
  meta?: { page: number; limit: number; total: number }
}
