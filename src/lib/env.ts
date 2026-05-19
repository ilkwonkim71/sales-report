/**
 * Server-side only. Import this module only in API routes, Server Components,
 * or server utilities — never in client components.
 *
 * Validates at access time so unit tests can override process.env per-test.
 */

export function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  get DATABASE_URL() {
    return getRequiredEnv("DATABASE_URL")
  },
  get JWT_SECRET() {
    return getRequiredEnv("JWT_SECRET")
  },
  get JWT_EXPIRES_IN() {
    return getRequiredEnv("JWT_EXPIRES_IN")
  },
  get NODE_ENV() {
    return (process.env.NODE_ENV ?? "development") as
      | "development"
      | "production"
      | "test"
  },
} as const
