import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/jwt"
import type { UserProfile } from "@/types/auth"

export async function POST(req: NextRequest): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    )
  }

  const { email, password } = body

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

  let staff
  try {
    staff = await prisma.salesStaff.findUnique({ where: { email } })
  } catch (dbErr) {
    console.error("[login] DB error:", dbErr)
    return Response.json(
      { error: { code: "SERVER_ERROR", message: "데이터베이스 연결 오류가 발생했습니다." } },
      { status: 500 }
    )
  }

  // Use a fixed dummy hash when staff is not found to prevent timing attacks.
  const hashToCompare =
    staff?.password ?? "$2b$10$invalidhashfortimingsafetyXXXXX"
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!staff || !passwordMatch) {
    return Response.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      },
      { status: 401 }
    )
  }

  const token = signToken({
    sub: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  })

  const user: UserProfile = {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    department: staff.department,
  }

  return Response.json({ data: { token, user } }, { status: 200 })
}
