export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiResponseWithMeta<T> {
  message: string;
  data: T;
  meta: PaginationMeta;
}
