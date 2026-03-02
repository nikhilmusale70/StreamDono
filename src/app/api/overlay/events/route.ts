import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOverlayTestEvents } from "@/lib/overlay-events"

type OverlayEvent = {
  id: string
  donorName: string
  amount: number
  message: string | null
  createdAtMs: number
  isTest: boolean
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase()
  const afterMs = Number(req.nextUrl.searchParams.get("after") ?? "0")

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 })
  }
  if (!Number.isFinite(afterMs) || afterMs < 0) {
    return NextResponse.json({ error: "Invalid after" }, { status: 400 })
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { donateSlug: slug },
    select: { userId: true, minDonationAmount: true, isActive: true },
  })
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!config.isActive) {
    return NextResponse.json({ events: [] })
  }

  const minAmountPaise = config.minDonationAmount * 100
  const donations = await prisma.donation.findMany({
    where: {
      userId: config.userId,
      status: "CAPTURED",
      amount: { gte: minAmountPaise },
      createdAt: { gt: new Date(afterMs) },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: {
      id: true,
      donorName: true,
      amount: true,
      message: true,
      createdAt: true,
    },
  })

  const dbEvents: OverlayEvent[] = donations.map((d) => ({
    id: d.id,
    donorName: d.donorName ?? "Anonymous",
    amount: d.amount,
    message: d.message ?? null,
    createdAtMs: d.createdAt.getTime(),
    isTest: false,
  }))

  const testEvents: OverlayEvent[] = getOverlayTestEvents(config.userId, afterMs).map(
    (e) => ({
      id: e.id,
      donorName: e.donorName,
      amount: e.amount,
      message: e.message,
      createdAtMs: e.createdAtMs,
      isTest: true,
    })
  )

  const events = [...dbEvents, ...testEvents].sort(
    (a, b) => a.createdAtMs - b.createdAtMs
  )

  return NextResponse.json({ events })
}
