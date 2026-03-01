import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  slug: z.string().min(1).max(50),
  amount: z.number().min(1).max(10000000), // INR, max 1 crore
  donorName: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
})

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { slug, amount, donorName, message } = schema.parse(body)

    const config = await prisma.streamerConfig.findUnique({
      where: { donateSlug: slug.toLowerCase().trim() },
      include: { user: true },
    })

    if (!config) {
      return NextResponse.json(
        { error: "Streamer not found" },
        { status: 404 }
      )
    }

    if (amount < config.minDonationAmount) {
      return NextResponse.json(
        { error: `Minimum donation is ₹${config.minDonationAmount}` },
        { status: 400 }
      )
    }

    const amountPaise = Math.round(amount * 100)

    const orderRes = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `don_${Date.now()}_${config.userId.slice(0, 8)}`,
        notes: {
          streamer_id: config.userId,
          donor_name: donorName ?? "Anonymous",
          message: message ?? "",
        },
      }),
    })

    if (!orderRes.ok) {
      const err = await orderRes.json()
      console.error("Razorpay order creation failed:", err)
      return NextResponse.json(
        { error: err.error?.description ?? "Payment failed" },
        { status: 400 }
      )
    }

    const order = await orderRes.json()

    await prisma.orderMapping.create({
      data: {
        orderId: order.id,
        userId: config.userId,
        donorName: donorName ?? "Anonymous",
        message: message ?? null,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      keyId,
      amount: amountPaise,
      currency: "INR",
      streamerName: config.user.name,
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Create order error:", e)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}
