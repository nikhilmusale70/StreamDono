import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

const STREAMLABS_ALERTS_URL = "https://streamlabs.com/api/v1.0/alerts"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config?.streamlabsToken) {
    return NextResponse.json(
      { error: "Streamlabs token not configured" },
      { status: 400 }
    )
  }

  try {
    const token = decrypt(config.streamlabsToken)
    const message = config.alertMessageTemplate
      .replace(/\{name\}/g, "Test Donor")
      .replace(/\{amount\}/g, "₹100")

    const res = await fetch(STREAMLABS_ALERTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        type: "donation",
        message,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Streamlabs API error:", res.status, text)
      return NextResponse.json(
        { error: `Streamlabs API error: ${res.status}. Check your token.` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: "Test alert sent!" })
  } catch (e) {
    console.error("Test alert error:", e)
    return NextResponse.json(
      { error: "Failed to send test alert" },
      { status: 500 }
    )
  }
}
