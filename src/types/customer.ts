// ── API response shapes ────────────────────────────────────────────────────

export interface Customer {
  id: number
  companyName: string
  contactName: string
  phone: string | null
  address: string | null
  createdAt: string
}

// ── Form / request shapes ──────────────────────────────────────────────────

export interface CreateCustomerForm {
  companyName: string
  contactName: string
  phone?: string
  address?: string
}

export type UpdateCustomerForm = Partial<CreateCustomerForm>
