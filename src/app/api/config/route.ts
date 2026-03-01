import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"
import { z } from "zod"

const configSchema = z.object({
  streamlabsToken: z.string().optional(),
  razorpayLink: z.string().min(1).optional(),
  webhookSecret: z.string().optional(), // From Razorpay dashboard when user adds webhook
  minDonationAmount: z.number().min(0).max(100000).optional(),
  alertMessageTemplate: z.string().max(500).optional(),
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
      streamlabsTokenSet: !!config.streamlabsToken,
      razorpayLink: config.razorpayLink,
      webhookSecretSet: !!config.webhookSecret,
      minDonationAmount: config.minDonationAmount,
      alertMessageTemplate: config.alertMessageTemplate,
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

    const razorpayLink = data.razorpayLink ?? existing?.razorpayLink ?? ""
    if (!razorpayLink) {
      return NextResponse.json(
        { error: "Razorpay payment link is required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      razorpayLink,
      minDonationAmount: data.minDonationAmount ?? existing?.minDonationAmount ?? 10,
      alertMessageTemplate: data.alertMessageTemplate ?? existing?.alertMessageTemplate ?? "{name} donated ₹{amount}",
      isActive: data.isActive ?? existing?.isActive ?? true,
    }

    if (data.streamlabsToken !== undefined) {
      updateData.streamlabsToken = data.streamlabsToken
        ? encrypt(data.streamlabsToken)
        : null
    }

    if (data.webhookSecret !== undefined && data.webhookSecret) {
      updateData.webhookSecret = data.webhookSecret
    }

    if (!existing) {
      updateData.userId = session.user.id
      updateData.webhookSecret = (updateData.webhookSecret as string) || null
    }

    const config = await prisma.streamerConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        streamlabsToken: updateData.streamlabsToken ? (updateData.streamlabsToken as string) : null,
        razorpayLink: updateData.razorpayLink as string,
        webhookSecret: (updateData.webhookSecret as string) || null,
        minDonationAmount: updateData.minDonationAmount as number,
        alertMessageTemplate: updateData.alertMessageTemplate as string,
        isActive: updateData.isActive as boolean,
      },
      update: {
        ...(updateData.streamlabsToken !== undefined && { streamlabsToken: (updateData.streamlabsToken as string) || null }),
        ...(updateData.razorpayLink !== undefined && { razorpayLink: updateData.razorpayLink as string }),
        ...(updateData.webhookSecret !== undefined && { webhookSecret: (updateData.webhookSecret as string) || null }),
        minDonationAmount: updateData.minDonationAmount as number,
        alertMessageTemplate: updateData.alertMessageTemplate as string,
        isActive: updateData.isActive as boolean,
      },
    })

    return NextResponse.json({
      config: {
        id: config.id,
        streamlabsTokenSet: !!config.streamlabsToken,
        razorpayLink: config.razorpayLink,
        webhookSecretSet: !!config.webhookSecret,
        minDonationAmount: config.minDonationAmount,
        alertMessageTemplate: config.alertMessageTemplate,
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
