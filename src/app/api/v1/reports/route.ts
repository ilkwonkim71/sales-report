import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/withAuth"
import { prisma } from "@/lib/prisma"

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)

  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const salesStaffFilter =
    user.role === "STAFF"
      ? { salesStaffId: user.id }
      : (() => {
          const raw = searchParams.get("staffId")
          const staffId = raw ? parseInt(raw, 10) : NaN
          return !isNaN(staffId) ? { salesStaffId: staffId } : {}
        })()

  const dateFilter =
    from || to
      ? {
          reportDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}

  const rows = await prisma.dailyReport.findMany({
    where: { ...salesStaffFilter, ...dateFilter },
    include: {
      salesStaff: { select: { id: true, name: true } },
      _count: { select: { visitRecords: true } },
    },
    orderBy: { reportDate: "desc" },
  })

  const data = rows.map((r) => ({
    id: r.id,
    reportDate: r.reportDate.toISOString().slice(0, 10),
    staff: r.salesStaff,
    visitCount: r._count.visitRecords,
    hasProblem: Boolean(r.problem),
    hasPlan: Boolean(r.plan),
    createdAt: r.createdAt.toISOString(),
  }))

  return Response.json({ data })
})
