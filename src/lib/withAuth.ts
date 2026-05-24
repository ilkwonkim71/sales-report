import type { NextRequest } from "next/server"
import { verifyToken } from "./jwt"
import { isBlacklisted } from "./tokenBlacklist"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

export type AuthedHandler = (
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
) => Promise<Response>

function unauthorized(message: string): Response {
  return Response.json(
    { error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  )
}

export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, context: RouteContext): Promise<Response> => {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized("Authentication required")
    }

    const token = authHeader.slice(7)

    try {
      if (isBlacklisted(token)) {
        return unauthorized("Token has been revoked")
      }

      const payload = verifyToken(token)
      const user: AuthenticatedUser = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      }

      return handler(req, user, context)
    } catch {
      return unauthorized("Invalid or expired token")
    }
  }
}
