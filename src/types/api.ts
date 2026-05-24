/** Standard success envelope returned by all API endpoints. */
export type ApiOk<T> = { data: T }

/** Standard error envelope returned by all API endpoints. */
export type ApiError = {
  error: {
    code: string
    message: string
  }
}

/** Union of success / error envelopes. */
export type ApiResponse<T> = ApiOk<T> | ApiError

// ── Error codes ────────────────────────────────────────────────────────────

export type AuthErrorCode = "INVALID_CREDENTIALS"
export type ReportErrorCode = "REPORT_ALREADY_EXISTS" | "CUSTOMER_NOT_FOUND"
export type VisitErrorCode = "LAST_VISIT_CANNOT_DELETE" | "CUSTOMER_NOT_FOUND"
export type StaffErrorCode = "EMAIL_ALREADY_EXISTS"

export type ApiErrorCode =
  | AuthErrorCode
  | ReportErrorCode
  | VisitErrorCode
  | StaffErrorCode

// ── HTTP status helpers ────────────────────────────────────────────────────

export type SuccessStatus = 200 | 201
export type ClientErrorStatus = 400 | 401 | 403 | 404 | 409
export type ServerErrorStatus = 500
export type HttpStatus = SuccessStatus | ClientErrorStatus | ServerErrorStatus

// ── Type guards ────────────────────────────────────────────────────────────

export function isApiOk<T>(res: ApiResponse<T>): res is ApiOk<T> {
  return "data" in res
}

export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return "error" in res
}
