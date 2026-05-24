import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── GET /api/v1/reports ──────────────────────────────────────────────────

async function getReports(
  req: NextRequest,
  user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  const { searchParams } = new URL(req.url)

  // Parse month (YYYY-MM), default to current month
  const monthParam = searchParams.get("month")
  const staffIdParam = searchParams.get("staff_id")

  let year: number
  let month: number

  if (monthParam) {
    const match = /^(\d{4})-(\d{2})$/.exec(monthParam)
    if (!match) {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "month must be YYYY-MM format" } },
        { status: 400 }
      )
    }
    year = parseInt(match[1], 10)
    month = parseInt(match[2], 10)
  } else {
    const now = new Date()
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  // Build where clause
  type WhereClause = {
    reportDate: { gte: Date; lt: Date }
    salesStaffId?: number
  }

  const where: WhereClause = {
    reportDate: { gte: startDate, lt: endDate },
  }

  if (user.role === "STAFF") {
    // STAFF can only see their own reports; staff_id param is ignored
    where.salesStaffId = user.id
  } else {
    // SUPERVISOR: optional staff_id filter
    if (staffIdParam) {
      const staffId = parseInt(staffIdParam, 10)
      if (isNaN(staffId)) {
        return Response.json(
          { error: { code: "BAD_REQUEST", message: "staff_id must be a number" } },
          { status: 400 }
        )
      }
      where.salesStaffId = staffId
    }
  }

  const reports = await prisma.dailyReport.findMany({
    where,
    include: {
      salesStaff: { select: { id: true, name: true } },
      visitRecords: { select: { id: true } },
    },
    orderBy: { reportDate: "desc" },
  })

  const data = reports.map((r) => ({
    id: r.id,
    report_date: r.reportDate.toISOString().slice(0, 10),
    staff: { id: r.salesStaff.id, name: r.salesStaff.name },
    visit_count: r.visitRecords.length,
    has_problem: r.problem !== null && r.problem.length > 0,
    has_plan: r.plan !== null && r.plan.length > 0,
    created_at: r.createdAt.toISOString(),
  }))

  return Response.json({ data }, { status: 200 })
}

// ── POST /api/v1/reports ─────────────────────────────────────────────────

async function createReport(
  req: NextRequest,
  user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  // Only STAFF can create reports
  if (user.role !== "STAFF") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only STAFF can create reports" } },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    )
  }

  const { report_date, visits, problem, plan } = body as {
    report_date?: unknown
    visits?: unknown
    problem?: unknown
    plan?: unknown
  }

  if (!report_date || typeof report_date !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "report_date is required" } },
      { status: 400 }
    )
  }

  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.exec(report_date)
  if (!dateMatch) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "report_date must be YYYY-MM-DD format" } },
      { status: 400 }
    )
  }

  if (!Array.isArray(visits) || visits.length === 0) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "visits must be a non-empty array" } },
      { status: 400 }
    )
  }

  type VisitInput = { customer_id: number; visit_content: string }
  const visitInputs = visits as VisitInput[]

  for (const v of visitInputs) {
    if (!v.customer_id || typeof v.customer_id !== "number") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "Each visit must have a customer_id" } },
        { status: 400 }
      )
    }
    if (!v.visit_content || typeof v.visit_content !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "Each visit must have visit_content" } },
        { status: 400 }
      )
    }
  }

  // Check for duplicate report
  const reportDate = new Date(report_date)
  const existing = await prisma.dailyReport.findUnique({
    where: { salesStaffId_reportDate: { salesStaffId: user.id, reportDate } },
  })

  if (existing) {
    return Response.json(
      { error: { code: "REPORT_ALREADY_EXISTS", message: "A report for this date already exists" } },
      { status: 409 }
    )
  }

  // Validate all customer IDs exist
  const customerIds = visitInputs.map((v) => v.customer_id)
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true },
  })
  const foundIds = new Set(customers.map((c) => c.id))
  const missingId = customerIds.find((id) => !foundIds.has(id))
  if (missingId !== undefined) {
    return Response.json(
      { error: { code: "CUSTOMER_NOT_FOUND", message: `Customer ${missingId} not found` } },
      { status: 400 }
    )
  }

  // Create report with visits in a transaction
  const report = await prisma.dailyReport.create({
    data: {
      salesStaffId: user.id,
      reportDate,
      problem: typeof problem === "string" ? problem : null,
      plan: typeof plan === "string" ? plan : null,
      visitRecords: {
        create: visitInputs.map((v) => ({
          customerId: v.customer_id,
          visitContent: v.visit_content,
        })),
      },
    },
    include: {
      salesStaff: { select: { id: true, name: true } },
      visitRecords: {
        include: {
          customer: { select: { id: true, companyName: true, contactName: true } },
        },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true } },
        },
      },
    },
  })

  return Response.json(
    {
      data: {
        id: report.id,
        report_date: report.reportDate.toISOString().slice(0, 10),
        staff: report.salesStaff,
        problem: report.problem,
        plan: report.plan,
        created_at: report.createdAt.toISOString(),
        updated_at: report.updatedAt.toISOString(),
        visits: report.visitRecords.map((v) => ({
          id: v.id,
          customer: {
            id: v.customer.id,
            company_name: v.customer.companyName,
            contact_name: v.customer.contactName,
          },
          visit_content: v.visitContent,
        })),
        comments: report.comments.map((c) => ({
          id: c.id,
          target_type: c.targetType,
          content: c.content,
          author: c.author,
          created_at: c.createdAt.toISOString(),
        })),
      },
    },
    { status: 201 }
  )
}

export const GET = withAuth(getReports)
export const POST = withAuth(createReport)
