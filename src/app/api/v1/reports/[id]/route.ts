import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── GET /api/v1/reports/:id ──────────────────────────────────────────────

async function getReport(
  _req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  const { id: idStr } = await context.params
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid report id" } },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id },
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
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!report) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Report not found" } },
      { status: 404 }
    )
  }

  // STAFF can only access their own reports
  if (user.role === "STAFF" && report.salesStaffId !== user.id) {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    )
  }

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
    { status: 200 }
  )
}

// ── PUT /api/v1/reports/:id ──────────────────────────────────────────────

async function updateReport(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  // Only STAFF can update reports
  if (user.role !== "STAFF") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only STAFF can update reports" } },
      { status: 403 }
    )
  }

  const { id: idStr } = await context.params
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid report id" } },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    select: { id: true, salesStaffId: true },
  })

  if (!report) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Report not found" } },
      { status: 404 }
    )
  }

  if (report.salesStaffId !== user.id) {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Access denied" } },
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

  const updateData: { problem?: string | null; plan?: string | null } = {}

  if ("problem" in body) {
    updateData.problem = typeof body.problem === "string" ? body.problem : null
  }
  if ("plan" in body) {
    updateData.plan = typeof body.plan === "string" ? body.plan : null
  }

  const updated = await prisma.dailyReport.update({
    where: { id },
    data: updateData,
    select: { id: true, problem: true, plan: true, updatedAt: true },
  })

  return Response.json(
    {
      data: {
        id: updated.id,
        problem: updated.problem,
        plan: updated.plan,
        updated_at: updated.updatedAt.toISOString(),
      },
    },
    { status: 200 }
  )
}

export const GET = withAuth(getReport)
export const PUT = withAuth(updateReport)
