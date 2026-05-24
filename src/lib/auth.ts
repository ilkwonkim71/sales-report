import type { NextRequest, NextResponse } from "next/server"
import type { AuthenticatedUser, Role } from "@/types/auth"
import { verifyToken } from "@/lib/jwt"
import { apiError } from "@/lib/response"

type WithAuthOptions = {
  role?: Role
}

type AuthedHandler<P = Record<string, string>> = (
  req: NextRequest,
  user: AuthenticatedUser,
  ctx: { params: Promise<P> }
) => Promise<NextResponse>

export function withAuth<P = Record<string, string>>(
  handler: AuthedHandler<P>,
  options?: WithAuthOptions
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get("Authorization")
      if (!authHeader?.startsWith("Bearer ")) {
        return apiError("UNAUTHORIZED", "인증이 필요합니다", 401)
      }

      const token = authHeader.slice(7)
      const payload = verifyToken(token)

      if (!payload) {
        return apiError("UNAUTHORIZED", "유효하지 않은 토큰입니다", 401)
      }

      if (options?.role && payload.role !== options.role) {
        return apiError("FORBIDDEN", "권한이 없습니다", 403)
      }

      const user: AuthenticatedUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      }

      return await handler(req, user, ctx)
    } catch (error) {
      console.error("[withAuth] Unhandled error:", error)
      return apiError("INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다", 500)
    }
  }
}
