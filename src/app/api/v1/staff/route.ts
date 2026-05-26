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

function toDto(s: {
  id: number; name: string; email: string; role: string
  department: string | null; createdAt: Date
}) {
  return { id: s.id, name: s.name, email: s.email, role: s.role, department: s.department, createdAt: s.createdAt.toISOString() }
}

export const GET = withAuth(async (req: NextRequest, user) => {
  if (user.role !== "SUPERVISOR") return forbidden()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  const staffList = await prisma.salesStaff.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" },
  })
  return Response.json({ data: staffList.map(toDto) })
})

export const POST = withAuth(async (req: NextRequest, user) => {
  if (user.role !== "SUPERVISOR") return forbidden()
  const body = await req.json()
  const { name, email, password, role, department } = body
  if (!name || !email || !password) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "name, email, password는 필수입니다." } }, { status: 400 })
  }
  const existing = await prisma.salesStaff.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: { code: "EMAIL_ALREADY_EXISTS", message: "이미 사용 중인 이메일입니다." } }, { status: 409 })
  }
  const hashed = await bcrypt.hash(password, 10)
  const staff = await prisma.salesStaff.create({
    data: { name, email, password: hashed, role: role ?? "STAFF", department: department || null },
  })
  return Response.json({ data: toDto(staff) }, { status: 201 })
})
