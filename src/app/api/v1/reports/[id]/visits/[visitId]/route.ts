import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// Helper: resolve report ownership
async function resolveReport(reportId: number) {
  return prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true, salesStaffId: true },
  })
}

// Helper: resolve visit record
async function resolveVisit(visitId: number, reportId: number) {
  return prisma.visitRecord.findFirst({
    where: { id: visitId, dailyReportId: reportId },
    select: { id: true },
  })
}

// ── PUT /api/v1/reports/:id/visits/:visitId ──────────────────────────────

async function updateVisit(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "STAFF") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only STAFF can update visit records" } },
      { status: 403 }
    )
  }

  const { id: idStr, visitId: visitIdStr } = await context.params
  const reportId = parseInt(idStr, 10)
  const visitId = parseInt(visitIdStr, 10)

  if (isNaN(reportId) || isNaN(visitId)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid id" } },
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

  const visit = await resolveVisit(visitId, reportId)

  if (!visit) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Visit record not found" } },
      { status: 404 }
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

  const updateData: { customerId?: number; visitContent?: string } = {}

  if ("customer_id" in body) {
    if (typeof body.customer_id !== "number") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "customer_id must be a number" } },
        { status: 400 }
      )
    }
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customer_id },
      select: { id: true },
    })
    if (!customer) {
      return Response.json(
        { error: { code: "CUSTOMER_NOT_FOUND", message: `Customer ${body.customer_id} not found` } },
        { status: 400 }
      )
    }
    updateData.customerId = body.customer_id
  }

  if ("visit_content" in body) {
    if (typeof body.visit_content !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "visit_content must be a string" } },
        { status: 400 }
      )
    }
    updateData.visitContent = body.visit_content
  }

  const updated = await prisma.visitRecord.update({
    where: { id: visitId },
    data: updateData,
    include: {
      customer: { select: { id: true, companyName: true, contactName: true } },
    },
  })

  return Response.json(
    {
      data: {
        id: updated.id,
        customer: {
          id: updated.customer.id,
          company_name: updated.customer.companyName,
          contact_name: updated.customer.contactName,
        },
        visit_content: updated.visitContent,
      },
    },
    { status: 200 }
  )
}

// ── DELETE /api/v1/reports/:id/visits/:visitId ───────────────────────────

async function deleteVisit(
  _req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "STAFF") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only STAFF can delete visit records" } },
      { status: 403 }
    )
  }

  const { id: idStr, visitId: visitIdStr } = await context.params
  const reportId = parseInt(idStr, 10)
  const visitId = parseInt(visitIdStr, 10)

  if (isNaN(reportId) || isNaN(visitId)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid id" } },
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

  const visit = await resolveVisit(visitId, reportId)

  if (!visit) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Visit record not found" } },
      { status: 404 }
    )
  }

  // Prevent deleting the last visit record
  const visitCount = await prisma.visitRecord.count({
    where: { dailyReportId: reportId },
  })

  if (visitCount <= 1) {
    return Response.json(
      {
        error: {
          code: "LAST_VISIT_CANNOT_DELETE",
          message: "Cannot delete the last visit record of a report",
        },
      },
      { status: 400 }
    )
  }

  await prisma.visitRecord.delete({ where: { id: visitId } })

  return Response.json({ data: null }, { status: 200 })
}

export const PUT = withAuth(updateVisit)
export const DELETE = withAuth(deleteVisit)
