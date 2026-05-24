import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/auth"
import { apiError } from "@/lib/response"

// Issue #5에서 구현
export const PUT = withAuth(async (_req: NextRequest) => {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}, { role: "STAFF" })

export const DELETE = withAuth(async (_req: NextRequest) => {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}, { role: "STAFF" })
