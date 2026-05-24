export type Role = "STAFF" | "SUPERVISOR"

// ── API shapes ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number
  name: string
  email: string
  role: Role
  department: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserProfile
}

// ── JWT payload stored inside the signed token ────────────────────────────

export interface JwtPayload {
  sub: number
  name: string
  email: string
  role: Role
  iat?: number
  exp?: number
}

// ── Augmented request type for authenticated handlers ─────────────────────

export interface AuthenticatedUser {
  id: number
  name: string
  email: string
  role: Role
}
