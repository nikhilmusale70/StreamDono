import { getServerSession } from "next/auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ConfigForm } from "@/components/ConfigForm"
import { prisma } from "@/lib/prisma"

export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: session.user.id },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const webhookUrl = config
    ? `${baseUrl}/api/webhook/${session.user.id}`
    : "— Configure Razorpay link first —"

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Connect Razorpay and Streamlabs for real-time donation alerts
        </p>
      </div>

      <ConfigForm
        initialConfig={
          config
            ? {
                streamlabsTokenSet: !!config.streamlabsToken,
                razorpayLink: config.razorpayLink,
                webhookSecretSet: !!config.webhookSecret,
                minDonationAmount: config.minDonationAmount,
                alertMessageTemplate: config.alertMessageTemplate,
                isActive: config.isActive,
              }
            : null
        }
        webhookUrl={webhookUrl}
      />
    </div>
  )
}
