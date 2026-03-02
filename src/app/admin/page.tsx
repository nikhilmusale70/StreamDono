import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatAmount } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type StreamerRow = {
  userId: string
  name: string
  email: string
  subscriptionTier: "FREE" | "PRO" | "ENTERPRISE"
  joinedAt: Date
  donateSlug: string | null
  isActive: boolean
  minDonationAmount: number
  alertMessageTemplate: string | null
  overlayAnimation: string | null
  overlayDurationMs: number
  overlayVolume: number
  totalRaised: number
  donationsCount: number
  averageDonation: number
  topDonation: number
  lastDonationAt: Date | null
  lastDonorName: string | null
}

function formatDate(value: Date | null) {
  if (!value) return "—"
  return value.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")
  if (!isAdminEmail(session.user.email)) redirect("/dashboard")

  const [users, configs, donationStats, recentDonations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        createdAt: true,
      },
    }),
    prisma.streamerConfig.findMany({
      select: {
        userId: true,
        donateSlug: true,
        isActive: true,
        minDonationAmount: true,
        alertMessageTemplate: true,
        overlayAnimation: true,
        overlayDurationMs: true,
        overlayVolume: true,
      },
    }),
    prisma.donation.groupBy({
      by: ["userId"],
      where: { status: "CAPTURED" },
      _sum: { amount: true },
      _count: { _all: true },
      _avg: { amount: true },
      _max: { amount: true, createdAt: true },
    }),
    prisma.donation.findMany({
      where: { status: "CAPTURED" },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        donorName: true,
        createdAt: true,
      },
      take: 1000,
    }),
  ])

  const configByUser = new Map(configs.map((config) => [config.userId, config]))
  const statsByUser = new Map(donationStats.map((stat) => [stat.userId, stat]))

  const recentByUser = new Map<string, { donorName: string | null; createdAt: Date }>()
  for (const donation of recentDonations) {
    if (!recentByUser.has(donation.userId)) {
      recentByUser.set(donation.userId, {
        donorName: donation.donorName,
        createdAt: donation.createdAt,
      })
    }
  }

  const rows: StreamerRow[] = users.map((user) => {
    const config = configByUser.get(user.id)
    const stats = statsByUser.get(user.id)
    const recent = recentByUser.get(user.id)

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      joinedAt: user.createdAt,
      donateSlug: config?.donateSlug ?? null,
      isActive: config?.isActive ?? false,
      minDonationAmount: config?.minDonationAmount ?? 0,
      alertMessageTemplate: config?.alertMessageTemplate ?? null,
      overlayAnimation: config?.overlayAnimation ?? null,
      overlayDurationMs: config?.overlayDurationMs ?? 5000,
      overlayVolume: config?.overlayVolume ?? 80,
      totalRaised: stats?._sum.amount ?? 0,
      donationsCount: stats?._count._all ?? 0,
      averageDonation: Math.round(stats?._avg.amount ?? 0),
      topDonation: stats?._max.amount ?? 0,
      lastDonationAt: recent?.createdAt ?? null,
      lastDonorName: recent?.donorName ?? null,
    }
  })

  rows.sort((a, b) => b.totalRaised - a.totalRaised)

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalRaised += row.totalRaised
      acc.totalDonations += row.donationsCount
      if (row.donationsCount > 0) acc.activeEarners += 1
      return acc
    },
    { totalRaised: 0, totalDonations: 0, activeEarners: 0 }
  )

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            All streamers, earnings, and configuration details
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Streamers</CardDescription>
            <CardTitle>{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Earned (All Time)</CardDescription>
            <CardTitle>{formatAmount(totals.totalRaised)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Donations</CardDescription>
            <CardTitle>{totals.totalDonations}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Streamers With Earnings</CardDescription>
            <CardTitle>{totals.activeEarners}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Streamer Breakdown</CardTitle>
          <CardDescription>
            Sorted by total earnings (highest first)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Streamer</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Joined</th>
                <th className="p-2">Donate URL</th>
                <th className="p-2">Alerts</th>
                <th className="p-2">Total Earned</th>
                <th className="p-2">Donations</th>
                <th className="p-2">Average</th>
                <th className="p-2">Top Donation</th>
                <th className="p-2">Last Donation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b align-top">
                  <td className="p-2 min-w-[220px]">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground break-all">{row.email}</p>
                  </td>
                  <td className="p-2">{row.subscriptionTier}</td>
                  <td className="p-2 whitespace-nowrap">{formatDate(row.joinedAt)}</td>
                  <td className="p-2">
                    {row.donateSlug ? (
                      <code className="text-xs">/donate/{row.donateSlug}</code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    <p>{row.isActive ? "Enabled" : "Disabled"}</p>
                    <p className="text-muted-foreground text-xs">
                      Min ₹{row.minDonationAmount}, {row.overlayAnimation ?? "slide"}, {Math.round(row.overlayDurationMs / 1000)}s, vol {row.overlayVolume}%
                    </p>
                  </td>
                  <td className="p-2 font-medium">{formatAmount(row.totalRaised)}</td>
                  <td className="p-2">{row.donationsCount}</td>
                  <td className="p-2">{formatAmount(row.averageDonation)}</td>
                  <td className="p-2">{formatAmount(row.topDonation)}</td>
                  <td className="p-2">
                    <p>{formatDate(row.lastDonationAt)}</p>
                    <p className="text-muted-foreground text-xs">{row.lastDonorName ?? "—"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Template Details</CardTitle>
          <CardDescription>
            Quick copy to audit each streamer&apos;s configured message template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={`${row.userId}-template`} className="rounded-md border p-3">
              <p className="font-medium">{row.name} ({row.email})</p>
              <p className="text-muted-foreground text-xs mt-1">
                {row.alertMessageTemplate ?? "No template configured"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

