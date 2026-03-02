import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enqueueOverlayTestEvent } from "@/lib/overlay-events"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: session.user.id },
    select: { donateSlug: true, isActive: true },
  })

  if (!config) {
    return NextResponse.json(
      { error: "Configuration not found" },
      { status: 400 }
    )
  }
  if (!config.isActive) {
    return NextResponse.json(
      { error: "Alerts are disabled. Enable alerts first." },
      { status: 400 }
    )
  }

  enqueueOverlayTestEvent(session.user.id)

  return NextResponse.json({
    success: true,
    message: "Test alert queued for overlay.",
    overlayUrl: `/overlay/${config.donateSlug}`,
  })
}
