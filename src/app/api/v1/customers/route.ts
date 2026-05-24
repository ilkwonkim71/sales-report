import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── GET /api/v1/customers ────────────────────────────────────────────────

async function getCustomers(
  req: NextRequest,
  _user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  })

  const data = customers.map((c) => ({
    id: c.id,
    company_name: c.companyName,
    contact_name: c.contactName,
    phone: c.phone,
    address: c.address,
    created_at: c.createdAt.toISOString(),
  }))

  return Response.json({ data }, { status: 200 })
}

// ── POST /api/v1/customers ───────────────────────────────────────────────

async function createCustomer(
  req: NextRequest,
  user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can create customers" } },
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

  const { company_name, contact_name, phone, address } = body

  if (!company_name || typeof company_name !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "company_name is required" } },
      { status: 400 }
    )
  }

  if (!contact_name || typeof contact_name !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "contact_name is required" } },
      { status: 400 }
    )
  }

  const customer = await prisma.customer.create({
    data: {
      companyName: company_name as string,
      contactName: contact_name as string,
      phone: typeof phone === "string" ? phone : null,
      address: typeof address === "string" ? address : null,
    },
  })

  return Response.json(
    {
      data: {
        id: customer.id,
        company_name: customer.companyName,
        contact_name: customer.contactName,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}

export const GET = withAuth(getCustomers)
export const POST = withAuth(createCustomer)
