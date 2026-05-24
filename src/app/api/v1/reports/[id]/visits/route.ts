import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// Helper: verify the report exists and belongs to the requesting STAFF user
async function resolveReport(reportId: number) {
  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true, salesStaffId: true },
  })
  return report
}

// ── POST /api/v1/reports/:id/visits ─────────────────────────────────────

async function createVisit(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "STAFF") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only STAFF can add visit records" } },
      { status: 403 }
    )
  }

  const { id: idStr } = await context.params
  const reportId = parseInt(idStr, 10)

  if (isNaN(reportId)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid report id" } },
      { status: 400 }
    )
  }

  const report = await resolveReport(reportId)

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

  const { customer_id, visit_content } = body

  if (!customer_id || typeof customer_id !== "number") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "customer_id is required" } },
      { status: 400 }
    )
  }

  if (!visit_content || typeof visit_content !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "visit_content is required" } },
      { status: 400 }
    )
  }

  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customer_id as number },
    select: { id: true, companyName: true, contactName: true },
  })

  if (!customer) {
    return Response.json(
      { error: { code: "CUSTOMER_NOT_FOUND", message: `Customer ${customer_id} not found` } },
      { status: 400 }
    )
  }

  const visit = await prisma.visitRecord.create({
    data: {
      dailyReportId: reportId,
      customerId: customer_id as number,
      visitContent: visit_content as string,
    },
    include: {
      customer: { select: { id: true, companyName: true, contactName: true } },
    },
  })

  return Response.json(
    {
      data: {
        id: visit.id,
        customer: {
          id: visit.customer.id,
          company_name: visit.customer.companyName,
          contact_name: visit.customer.contactName,
        },
        visit_content: visit.visitContent,
      },
    },
    { status: 201 }
  )
}

export const POST = withAuth(createVisit)
