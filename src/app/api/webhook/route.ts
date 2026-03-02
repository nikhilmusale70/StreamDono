import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

const STREAMLABS_ALERTS_URL = "https://streamlabs.com/api/v1.0/alerts"

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("Webhook: RAZORPAY_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!signature) {
    console.error("Webhook: Missing X-Razorpay-Signature header")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex")

  if (signature !== expectedSignature) {
    console.error("Webhook: Signature mismatch")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: {
    event: string
    payload?: { payment?: { entity?: Record<string, unknown> } }
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.event !== "payment.captured" && payload.event !== "order.paid") {
    return NextResponse.json({ received: true })
  }

  const payment = payload.payload?.payment?.entity
  if (!payment) {
    console.error("Webhook: No payment entity in payload")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const razorpayPaymentId = payment.id as string
  const orderId = payment.order_id as string
  const amount = payment.amount as number
  const currency = (payment.currency as string) ?? "INR"
  const donorEmail = (payment.email as string) ?? null

  if (!razorpayPaymentId || !orderId || typeof amount !== "number") {
    console.error("Webhook: Missing required payment fields")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const existing = await prisma.donation.findUnique({
    where: { razorpayPaymentId },
  })
  if (existing) {
    return NextResponse.json({ received: true })
  }

  const orderMapping = await prisma.orderMapping.findUnique({
    where: { orderId },
  })

  if (!orderMapping) {
    console.error("Webhook: Order mapping not found for", orderId)
    return NextResponse.json({ error: "Order not found" }, { status: 400 })
  }

  let donation: { id: string }
  try {
    donation = await prisma.donation.create({
      data: {
        userId: orderMapping.userId,
        razorpayPaymentId,
        donorName: orderMapping.donorName ?? "Anonymous",
        donorEmail,
        amount,
        currency,
        message: orderMapping.message,
        status: "CAPTURED",
      },
      select: { id: true },
    })
  } catch (e) {
    // Idempotency: if Razorpay retries the same payment webhook concurrently,
    // unique constraint on `razorpayPaymentId` can race. Treat as already processed.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ received: true })
    }
    throw e
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { userId: orderMapping.userId },
  })

  if (!config) return NextResponse.json({ received: true })

  const minAmount = config.minDonationAmount * 100
  if (amount < minAmount || !config.isActive || !config.streamlabsToken) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { alertSent: true },
    })
    return NextResponse.json({ received: true })
  }

  try {
    const token = decrypt(config.streamlabsToken)
    const amountRupees = (amount / 100).toLocaleString("en-IN")
    const donorName = orderMapping.donorName ?? "Anonymous"
    const message = orderMapping.message ?? ""
    const alertMessage = config.alertMessageTemplate
      .replace(/\{name\}/g, donorName)
      .replace(/\{amount\}/g, `₹${amountRupees}`)
      .replace(/\{message\}/g, message)

    const res = await fetch(STREAMLABS_ALERTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        type: "donation",
        message: alertMessage,
      }),
    })

    if (res.ok) {
      await prisma.donation.update({
        where: { id: donation.id },
        data: { alertSent: true },
      })
    } else {
      console.error("Streamlabs alert failed:", res.status, await res.text())
    }
  } catch (e) {
    console.error("Streamlabs alert error:", e)
  }

  await prisma.orderMapping.delete({ where: { orderId } }).catch(() => {})

  return NextResponse.json({ received: true })
}
