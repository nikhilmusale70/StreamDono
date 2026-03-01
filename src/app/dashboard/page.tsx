import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatAmount } from "@/lib/utils"
import { StatsCard } from "@/components/StatsCard"
import { DonationCard } from "@/components/DonationCard"
import { DonationChart } from "@/components/DonationChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, Gift, TrendingUp, User, Settings, Download } from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [stats, donations, allDonations] = await Promise.all([
    prisma.donation.aggregate({
      where: { userId: session.user.id, status: "CAPTURED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.groupBy({
      by: ["donorName"],
      where: { userId: session.user.id, status: "CAPTURED", donorName: { not: null } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    }),
    prisma.donation.findMany({
      where: {
        userId: session.user.id,
        status: "CAPTURED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, createdAt: true },
    }),
  ])

  const totalRaised = stats._sum.amount ?? 0
  const count = stats._count
  const average = count > 0 ? Math.round(totalRaised / count) : 0
  const topDonor = donations[0]

  const [recentDonations, chartData] = await Promise.all([
    prisma.donation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    (() => {
      const byDate = new Map<string, { amount: number; count: number }>()
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (29 - i))
        byDate.set(d.toISOString().slice(0, 10), { amount: 0, count: 0 })
      }
      for (const d of allDonations) {
        const key = d.createdAt.toISOString().slice(0, 10)
        const ex = byDate.get(key)
        if (ex) {
          ex.amount += d.amount
          ex.count += 1
        }
      }
      return Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { amount, count }]) => ({
          date: new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          amount,
          count,
        }))
    })(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your donations and earnings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Raised"
          value={formatAmount(totalRaised)}
          icon={IndianRupee}
        />
        <StatsCard
          title="Donations"
          value={count}
          icon={Gift}
          description={`${count} total donations`}
        />
        <StatsCard
          title="Average"
          value={formatAmount(average)}
          icon={TrendingUp}
        />
        <StatsCard
          title="Top Donor"
          value={topDonor ? topDonor.donorName ?? "Anonymous" : "—"}
          icon={User}
          description={
            topDonor ? formatAmount(topDonor._sum.amount ?? 0) : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Donations (Last 30 days)</CardTitle>
            <CardDescription>Daily donation trend</CardDescription>
          </CardHeader>
          <CardContent>
            <DonationChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest 10 donations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/donations">
                  View all
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/donations/export" download>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDonations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No donations yet</p>
                <p className="text-sm mt-1">
                  Set up your config and share your Razorpay link
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/config">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDonations.map((d) => (
                  <DonationCard
                    key={d.id}
                    donorName={d.donorName ?? "Anonymous"}
                    amount={d.amount}
                    message={d.message}
                    createdAt={d.createdAt}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
