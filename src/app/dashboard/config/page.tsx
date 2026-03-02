import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ConfigForm } from "@/components/ConfigForm"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: session.user.id },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const donateUrl = config
    ? `${baseUrl}/donate/${config.donateSlug}`
    : `${baseUrl}/donate/`
  const overlayUrl = config
    ? `${baseUrl}/overlay/${config.donateSlug}`
    : `${baseUrl}/overlay/your-slug`

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Set up your donate page and real-time alerts for stream overlay
        </p>
      </div>

      <ConfigForm
        initialConfig={
          config
            ? {
                donateSlug: config.donateSlug,
                minDonationAmount: config.minDonationAmount,
                alertMessageTemplate: config.alertMessageTemplate,
                overlayAnimation: (config.overlayAnimation as "slide" | "pop" | "bounce") ?? "slide",
                overlaySoundUrl: config.overlaySoundUrl,
                isActive: config.isActive,
              }
            : null
        }
        donateUrl={donateUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle>OBS Overlay URL</CardTitle>
          <CardDescription>
            Add this as a Browser Source in OBS/Streamlabs Desktop for live alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm break-all">{overlayUrl}</p>
        </CardContent>
      </Card>
    </div>
  )
}
