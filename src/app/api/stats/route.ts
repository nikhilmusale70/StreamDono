import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") ?? "all" // all, month, week, day

  const now = new Date()
  let startDate: Date | undefined
  if (period === "day") {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 1)
  } else if (period === "week") {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === "month") {
    startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - 1)
  }

  const where = {
    userId: session.user.id,
    status: "CAPTURED" as const,
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  }

  const [donations, topDonor, totalCount] = await Promise.all([
    prisma.donation.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.groupBy({
      by: ["donorName"],
      where: { ...where, donorName: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    }),
    prisma.donation.count({ where }),
  ])

  const totalRaised = donations._sum.amount ?? 0
  const count = donations._count
  const average = count > 0 ? Math.round(totalRaised / count) : 0
  const topDonorData = topDonor[0]

  return NextResponse.json({
    totalRaised,
    count,
    average,
    topDonor: topDonorData
      ? {
          name: topDonorData.donorName ?? "Anonymous",
          amount: topDonorData._sum.amount ?? 0,
        }
      : null,
  })
}
