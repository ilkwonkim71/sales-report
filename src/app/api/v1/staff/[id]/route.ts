import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

const BCRYPT_ROUNDS = 10

// ── PUT /api/v1/staff/:id ────────────────────────────────────────────────

async function updateStaff(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can update staff" } },
      { status: 403 }
    )
  }

  const { id: idStr } = await context.params
  const id = parseInt(idStr, 10)

  if (isNaN(id)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid staff id" } },
      { status: 400 }
    )
  }

  const existing = await prisma.salesStaff.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Staff not found" } },
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
    name?: string
    email?: string
    password?: string
    role?: "STAFF" | "SUPERVISOR"
    department?: string | null
  } = {}

  if ("name" in body) {
    if (typeof body.name !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "name must be a string" } },
        { status: 400 }
      )
    }
    updateData.name = body.name
  }

  if ("email" in body) {
    if (typeof body.email !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "email must be a string" } },
        { status: 400 }
      )
    }
    // Check for duplicate email (exclude current staff)
    const emailConflict = await prisma.salesStaff.findFirst({
      where: { email: body.email, NOT: { id } },
      select: { id: true },
    })
    if (emailConflict) {
      return Response.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "Email already in use" } },
        { status: 409 }
      )
    }
    updateData.email = body.email
  }

  if ("password" in body) {
    if (typeof body.password !== "string") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "password must be a string" } },
        { status: 400 }
      )
    }
    updateData.password = await bcrypt.hash(body.password, BCRYPT_ROUNDS)
  }

  if ("role" in body) {
    if (body.role !== "STAFF" && body.role !== "SUPERVISOR") {
      return Response.json(
        { error: { code: "BAD_REQUEST", message: "role must be STAFF or SUPERVISOR" } },
        { status: 400 }
      )
    }
    updateData.role = body.role as "STAFF" | "SUPERVISOR"
  }

  if ("department" in body) {
    updateData.department = typeof body.department === "string" ? body.department : null
  }

  const updated = await prisma.salesStaff.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
  })

  return Response.json(
    {
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        department: updated.department,
        created_at: updated.createdAt.toISOString(),
      },
    },
    { status: 200 }
  )
}

export const PUT = withAuth(updateStaff)
