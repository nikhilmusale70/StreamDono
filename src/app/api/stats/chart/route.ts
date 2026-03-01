import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const donations = await prisma.donation.findMany({
    where: {
      userId: session.user.id,
      status: "CAPTURED",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { amount: true, createdAt: true },
  })

  const byDate = new Map<string, { amount: number; count: number }>()
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    byDate.set(key, { amount: 0, count: 0 })
  }

  for (const d of donations) {
    const key = d.createdAt.toISOString().slice(0, 10)
    const existing = byDate.get(key)
    if (existing) {
      existing.amount += d.amount
      existing.count += 1
    } else {
      byDate.set(key, { amount: d.amount, count: 1 })
    }
  }

  const data = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { amount, count }]) => ({
      date: new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      amount,
      count,
    }))

  return NextResponse.json({ data })
}
