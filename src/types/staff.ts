import type { Role } from "./auth"

// ── API response shapes ────────────────────────────────────────────────────

export interface Staff {
  id: number
  name: string
  email: string
  role: Role
  department: string | null
  createdAt: string
}

// ── Form / request shapes ──────────────────────────────────────────────────

export interface CreateStaffForm {
  name: string
  email: string
  password: string
  role: Role
  department?: string
}

export interface UpdateStaffForm {
  name?: string
  email?: string
  password?: string
  role?: Role
  department?: string
}

export type { Role }
