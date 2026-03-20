export type ApiResponse<T> = { success: true; data: T }
export type ApiErrorResponse = { success: false; error: { code: string; message: string } }
