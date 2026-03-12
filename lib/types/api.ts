export type ApiResponse<T> = { success: true; data: T }
export type ApiErrorResponse = { success: false; error: { code: string; message: string } }
export type PaginatedResponse<T> = ApiResponse<{ items: T[]; total: number; page: number; pageSize: number }>
