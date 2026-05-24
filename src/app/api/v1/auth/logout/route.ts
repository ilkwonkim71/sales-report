import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/withAuth"
import { addToBlacklist } from "@/lib/tokenBlacklist"
import type { AuthenticatedUser } from "@/types/auth"

export const POST = withAuth(
  async (req: NextRequest, _user: AuthenticatedUser): Promise<Response> => {
    const token = req.headers.get("Authorization")!.slice(7)
    addToBlacklist(token)
    return Response.json({ data: null }, { status: 200 })
  }
)
