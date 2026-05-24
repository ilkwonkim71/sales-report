import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/auth"
import { apiError } from "@/lib/response"

// Issue #6에서 구현
export const POST = withAuth(async (_req: NextRequest) => {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}, { role: "SUPERVISOR" })
