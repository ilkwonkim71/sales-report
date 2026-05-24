import type { NextRequest } from "next/server"
import { apiError } from "@/lib/response"

// Issue #3에서 구현
export async function POST(_req: NextRequest) {
  return apiError("NOT_IMPLEMENTED", "미구현", 500)
}
