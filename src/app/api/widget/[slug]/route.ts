import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const config = await prisma.streamerConfig.findUnique({
    where: { donateSlug: slug },
  })

  if (!config || !config.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const donation = await prisma.donation.findFirst({
    where: { userId: config.userId, status: "CAPTURED" },
    orderBy: { createdAt: "desc" },
  })

  if (!donation) {
    return NextResponse.json({ donation: null, alertMessageTemplate: config.alertMessageTemplate ?? "" })
  }

  return NextResponse.json({
    donation: {
      id: donation.id,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      amount: donation.amount,
      currency: donation.currency,
      message: donation.message,
      createdAt: donation.createdAt.toISOString(),
    },
    alertMessageTemplate: config.alertMessageTemplate ?? "{name} donated ₹{amount}",
  })
}
