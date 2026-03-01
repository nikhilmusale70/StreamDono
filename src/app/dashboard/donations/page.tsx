import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DonationCard } from "@/components/DonationCard"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default async function DonationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const donations = await prisma.donation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Donations</h1>
          <p className="text-muted-foreground mt-1">
            Full donation history
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/donations/export" download>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>

      {donations.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No donations yet</p>
          <p className="text-sm mt-1">
            Configure your Razorpay and Streamlabs integration to start receiving donations
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/config">Go to Config</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
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
    </div>
  )
}
