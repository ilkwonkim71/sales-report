import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/auth"
import { apiError } from "@/lib/response"

// Issue #8에서 구현
export const GET = withAuth(async (_req: NextRequest) => {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}, { role: "SUPERVISOR" })

export const POST = withAuth(async (_req: NextRequest) => {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}, { role: "SUPERVISOR" })
