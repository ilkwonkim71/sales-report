import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── POST /api/v1/reports/:id/comments ───────────────────────────────────

async function createComment(
  req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can add comments" } },
      { status: 403 }
    )
  }

  const { id: idStr } = await context.params
  const reportId = parseInt(idStr, 10)

  if (isNaN(reportId)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid report id" } },
      { status: 400 }
    )
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    select: { id: true },
  })

  if (!report) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Report not found" } },
      { status: 404 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    )
  }

  const { target_type, content } = body

  if (target_type !== "PROBLEM" && target_type !== "PLAN") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "target_type must be PROBLEM or PLAN" } },
      { status: 400 }
    )
  }

  if (!content || typeof content !== "string") {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "content is required" } },
      { status: 400 }
    )
  }

  const comment = await prisma.comment.create({
    data: {
      dailyReportId: reportId,
      authorId: user.id,
      targetType: target_type as "PROBLEM" | "PLAN",
      content: content as string,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  })

  return Response.json(
    {
      data: {
        id: comment.id,
        target_type: comment.targetType,
        content: comment.content,
        author: comment.author,
        created_at: comment.createdAt.toISOString(),
      },
    },
    { status: 201 }
  )
}

export const POST = withAuth(createComment)
