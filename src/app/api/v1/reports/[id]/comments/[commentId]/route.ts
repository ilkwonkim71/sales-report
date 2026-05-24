import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"
import type { AuthenticatedUser } from "@/types/auth"

type RouteContext = { params: Promise<Record<string, string>> }

// ── DELETE /api/v1/reports/:id/comments/:commentId ───────────────────────

async function deleteComment(
  _req: NextRequest,
  user: AuthenticatedUser,
  context: RouteContext
): Promise<Response> {
  if (user.role !== "SUPERVISOR") {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "Only SUPERVISOR can delete comments" } },
      { status: 403 }
    )
  }

  const { id: idStr, commentId: commentIdStr } = await context.params
  const reportId = parseInt(idStr, 10)
  const commentId = parseInt(commentIdStr, 10)

  if (isNaN(reportId) || isNaN(commentId)) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "Invalid id" } },
      { status: 400 }
    )
  }

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, dailyReportId: reportId },
    select: { id: true, authorId: true },
  })

  if (!comment) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Comment not found" } },
      { status: 404 }
    )
  }

  // SUPERVISOR can only delete their own comments
  if (comment.authorId !== user.id) {
    return Response.json(
      { error: { code: "FORBIDDEN", message: "You can only delete your own comments" } },
      { status: 403 }
    )
  }

  await prisma.comment.delete({ where: { id: commentId } })

  return Response.json({ data: null }, { status: 200 })
}

export const DELETE = withAuth(deleteComment)
