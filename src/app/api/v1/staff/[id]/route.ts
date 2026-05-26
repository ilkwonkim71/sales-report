import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { withAuth } from "@/lib/withAuth"
import { prisma } from "@/lib/prisma"

function forbidden() {
  return Response.json(
    { error: { code: "FORBIDDEN", message: "Access denied" } },
    { status: 403 },
  )
}

function notFound() {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "영업사원을 찾을 수 없습니다." } },
    { status: 404 },
  )
}

function toDto(s: {
  id: number
  name: string
  email: string
  role: string
  department: string | null
  createdAt: Date
}) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    department: s.department,
    createdAt: s.createdAt.toISOString(),
  }
}

export const GET = withAuth(async (_req: NextRequest, user, context) => {
  if (user.role !== "SUPERVISOR") return forbidden()

  const { id } = await context.params
  const staffId = parseInt(id, 10)
  if (isNaN(staffId)) return notFound()

  const staff = await prisma.salesStaff.findUnique({ where: { id: staffId } })
  if (!staff) return notFound()

  return Response.json({ data: toDto(staff) })
})

export const PUT = withAuth(async (req: NextRequest, user, context) => {
  if (user.role !== "SUPERVISOR") return forbidden()

  const { id } = await context.params
  const staffId = parseInt(id, 10)
  if (isNaN(staffId)) return notFound()

  const body = await req.json()
  const { name, email, password, role, department } = body

  const existing = await prisma.salesStaff.findUnique({ where: { id: staffId } })
  if (!existing) return notFound()

  if (email && email !== existing.email) {
    const dup = await prisma.salesStaff.findUnique({ where: { email } })
    if (dup) {
      return Response.json(
        { error: { code: "EMAIL_ALREADY_EXISTS", message: "이미 사용 중인 이메일입니다." } },
        { status: 409 },
      )
    }
  }

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (role) data.role = role
  if (department !== undefined) data.department = department || null
  if (password) data.password = await bcrypt.hash(password, 10)

  const updated = await prisma.salesStaff.update({ where: { id: staffId }, data })
  return Response.json({ data: toDto(updated) })
})
