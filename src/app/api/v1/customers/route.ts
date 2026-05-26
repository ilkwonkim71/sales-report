import type { NextRequest } from "next/server"
import { withAuth } from "@/lib/withAuth"
import { prisma } from "@/lib/prisma"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  })

  const data = customers.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    contactName: c.contactName,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt.toISOString(),
  }))

  return Response.json({ data })
})
