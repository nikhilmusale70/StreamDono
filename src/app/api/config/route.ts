import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const configSchema = z.object({
  donateSlug: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, "Use only lowercase letters, numbers, hyphens"),
  minDonationAmount: z.number().min(0).max(100000).optional(),
  alertMessageTemplate: z.string().max(500).optional(),
  overlayAnimation: z.enum(["slide", "pop", "bounce"]).optional(),
  overlaySoundUrl: z.string().max(1200000).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config) {
    return NextResponse.json({ config: null })
  }

  // Return config but never expose decrypted token (only indicate if set)
  return NextResponse.json({
    config: {
      id: config.id,
      donateSlug: config.donateSlug,
      minDonationAmount: config.minDonationAmount,
      alertMessageTemplate: config.alertMessageTemplate,
      overlayAnimation: config.overlayAnimation,
      overlaySoundUrl: config.overlaySoundUrl,
      isActive: config.isActive,
    },
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = configSchema.parse(body)

    const existing = await prisma.streamerConfig.findUnique({
      where: { userId: session.user.id },
    })

    const donateSlug = (data.donateSlug ?? existing?.donateSlug ?? "").toLowerCase().trim()
    if (!donateSlug) {
      return NextResponse.json(
        { error: "Donate page URL slug is required" },
        { status: 400 }
      )
    }

    const slugExists = await prisma.streamerConfig.findFirst({
      where: {
        donateSlug,
        userId: { not: session.user.id },
      },
    })
    if (slugExists) {
      return NextResponse.json(
        { error: "This URL slug is already taken" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      donateSlug,
      minDonationAmount: data.minDonationAmount ?? existing?.minDonationAmount ?? 10,
      alertMessageTemplate: data.alertMessageTemplate ?? existing?.alertMessageTemplate ?? "{name} donated ₹{amount}",
      overlayAnimation: data.overlayAnimation ?? existing?.overlayAnimation ?? "slide",
      overlaySoundUrl: data.overlaySoundUrl !== undefined ? data.overlaySoundUrl : (existing?.overlaySoundUrl ?? null),
      isActive: data.isActive ?? existing?.isActive ?? true,
    }

    const config = await prisma.streamerConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        donateSlug: updateData.donateSlug as string,
        minDonationAmount: updateData.minDonationAmount as number,
        alertMessageTemplate: updateData.alertMessageTemplate as string,
        overlayAnimation: updateData.overlayAnimation as string,
        overlaySoundUrl: updateData.overlaySoundUrl as string | null,
        isActive: updateData.isActive as boolean,
      },
      update: {
        donateSlug: updateData.donateSlug as string,
        minDonationAmount: updateData.minDonationAmount as number,
        alertMessageTemplate: updateData.alertMessageTemplate as string,
        overlayAnimation: updateData.overlayAnimation as string,
        overlaySoundUrl: updateData.overlaySoundUrl as string | null,
        isActive: updateData.isActive as boolean,
      },
    })

    return NextResponse.json({
      config: {
        id: config.id,
        donateSlug: config.donateSlug,
        minDonationAmount: config.minDonationAmount,
        alertMessageTemplate: config.alertMessageTemplate,
        overlayAnimation: config.overlayAnimation,
        overlaySoundUrl: config.overlaySoundUrl,
        isActive: config.isActive,
      },
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    )
  }
}
