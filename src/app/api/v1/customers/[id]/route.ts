import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── PUT /api/v1/customers/:id ────────────────────────────────────────────

async function updateCustomer(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can update customers" } },
      { status: 403 }
    )
  }

  const { id: idStr } = await context.params
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid customer id" } },
      { status: 400 }
    )
  }

  const existing = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Customer not found" } },
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

  const updateData: {
    companyName?: string
    contactName?: string
    phone?: string | null
    address?: string | null
  } = {}

  if ("company_name" in body) {
    if (typeof body.company_name !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "company_name must be a string" } },
        { status: 400 }
      )
    }
    updateData.companyName = body.company_name
  }

  if ("contact_name" in body) {
    if (typeof body.contact_name !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "contact_name must be a string" } },
        { status: 400 }
      )
    }
    updateData.contactName = body.contact_name
  }

  if ("phone" in body) {
    updateData.phone = typeof body.phone === "string" ? body.phone : null
  }

  if ("address" in body) {
    updateData.address = typeof body.address === "string" ? body.address : null
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: updateData,
  })

  return Response.json(
    {
      data: {
        id: updated.id,
        company_name: updated.companyName,
        contact_name: updated.contactName,
        phone: updated.phone,
        address: updated.address,
        created_at: updated.createdAt.toISOString(),
      },
    },
    { status: 200 }
  )
}

export const PUT = withAuth(updateCustomer)
