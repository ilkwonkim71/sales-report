import type { Role } from "./auth"

// ── Shared summary shapes (nested in responses) ────────────────────────────

export interface StaffSummary {
  id: number
  name: string
}

export interface StaffDetail extends StaffSummary {
  department: string | null
}

export interface CustomerSummary {
  id: number
  companyName: string
  contactName: string
}

// ── Visit records ──────────────────────────────────────────────────────────

export interface VisitRecord {
  id: number
  customer: CustomerSummary
  visitContent: string
}

// ── Comments ───────────────────────────────────────────────────────────────

export type CommentTarget = "PROBLEM" | "PLAN"

export interface ReportComment {
  id: number
  targetType: CommentTarget
  content: string
  author: StaffSummary
  createdAt: string
}

// ── Report list item (GET /reports) ───────────────────────────────────────

export interface ReportListItem {
  id: number
  reportDate: string
  staff: StaffSummary
  visitCount: number
  hasProblem: boolean
  hasPlan: boolean
  createdAt: string
}

// ── Report detail (GET /reports/:id) ──────────────────────────────────────

export interface ReportDetail {
  id: number
  reportDate: string
  staff: StaffDetail
  visits: VisitRecord[]
  problem: string | null
  plan: string | null
  comments: ReportComment[]
  createdAt: string
  updatedAt: string
}

// ── Form / request shapes ──────────────────────────────────────────────────

export interface VisitInput {
  customerId: number
  visitContent: string
}

export interface CreateReportForm {
  reportDate: string
  visits: VisitInput[]
  problem?: string
  plan?: string
}

export interface UpdateReportForm {
  problem?: string
  plan?: string
}

export interface CreateCommentForm {
  targetType: CommentTarget
  content: string
}

// ── Status helpers ─────────────────────────────────────────────────────────

export type ReportStatus = "complete" | "pending"

export function getReportStatus(_report: Pick<ReportListItem, "visitCount">): ReportStatus {
  // A report exists in the list means it was submitted; list items with 0
  // visits represent "미작성" placeholders generated client-side.
  return _report.visitCount > 0 ? "complete" : "pending"
}

// Re-export Role so callers can import from one place
export type { Role }
