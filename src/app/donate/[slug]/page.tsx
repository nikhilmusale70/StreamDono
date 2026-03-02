import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DonateForm } from "./DonateForm"

export default async function DonatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = await prisma.streamerConfig.findUnique({
    where: { donateSlug: slug.toLowerCase().trim() },
    include: { user: true },
  })

  if (!config) notFound()
  const streamerDisplayName = config.displayName?.trim() || config.user.name

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Support {streamerDisplayName}</h1>
          <p className="text-muted-foreground mt-1">
            Enter any amount you&apos;d like to donate
          </p>
        </div>
        <DonateForm
          slug={slug}
          streamerName={streamerDisplayName}
          minAmount={config.minDonationAmount}
        />
      </div>
    </div>
  )
}
