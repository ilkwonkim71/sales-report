import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

const BCRYPT_ROUNDS = 10

// ── GET /api/v1/staff ────────────────────────────────────────────────────

async function getStaffList(
  req: NextRequest,
  user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can view staff list" } },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")

  const staffList = await prisma.salesStaff.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const data = staffList.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    department: s.department,
    created_at: s.createdAt.toISOString(),
  }))

  return Response.json({ data }, { status: 200 })
}

// ── POST /api/v1/staff ───────────────────────────────────────────────────

async function createStaff(
  req: NextRequest,
  user: AuthenticatedUser,
  _context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can create staff" } },
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

  const { name, email, password, role, department } = body

  if (!name || typeof name !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "name is required" } },
      { status: 400 }
    )
  }

  if (!email || typeof email !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "email is required" } },
      { status: 400 }
    )
  }

  if (!password || typeof password !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "password is required" } },
      { status: 400 }
    )
  }

  if (role !== undefined && role !== "STAFF" && role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "role must be STAFF or SUPERVISOR" } },
      { status: 400 }
    )
  }

  // Check for duplicate email
  const existing = await prisma.salesStaff.findUnique({
    where: { email: email as string },
    select: { id: true },
  })

  if (existing) {
    return Response.json(
      { error: { code: "EMAIL_ALREADY_EXISTS", message: "Email already in use" } },
      { status: 409 }
    )
  }

  const hashedPassword = await bcrypt.hash(password as string, BCRYPT_ROUNDS)

  const staff = await prisma.salesStaff.create({
    data: {
      name: name as string,
      email: email as string,
      password: hashedPassword,
      role: (role as "STAFF" | "SUPERVISOR") ?? "STAFF",
      department: typeof department === "string" ? department : null,
    },
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
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        created_at: staff.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}

export const GET = withAuth(getStaffList)
export const POST = withAuth(createStaff)
