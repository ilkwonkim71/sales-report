/**
 * API client helper.
 * - Automatically attaches Authorization header from localStorage.
 * - Converts snake_case response keys to camelCase recursively.
 */

/** Recursively convert snake_case object keys to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function transformKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(transformKeys)
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = transformKeys(obj[key])
    }
    return result
  }
  return value
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(path, { ...options, headers })

  const json: unknown = await response.json()

  if (!response.ok) {
    const errBody = json as { error?: { code?: string; message?: string } }
    const code = errBody?.error?.code ?? "UNKNOWN_ERROR"
    const message = errBody?.error?.message ?? "An unexpected error occurred"
    throw new ApiError(code, message, response.status)
  }

  const body = json as { data: unknown }
  return transformKeys(body.data) as T
}
