import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

const STREAMLABS_ALERTS_URL = "https://streamlabs.com/api/v1.0/alerts"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  // Get raw body for signature verification (critical for Razorpay)
  const rawBody = await req.text()
  const signature = req.headers.get("x-razorpay-signature")

  if (!signature) {
    console.error("Webhook: Missing X-Razorpay-Signature header")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const config = await prisma.streamerConfig.findUnique({
    where: { userId },
  })

  if (!config) {
    console.error("Webhook: Config not found for user", userId)
    return NextResponse.json({ error: "Config not found" }, { status: 404 })
  }

  if (!config.webhookSecret) {
    console.error("Webhook: Webhook secret not configured for user", userId)
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 })
  }

  // Verify Razorpay webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(rawBody)
    .digest("hex")

  if (signature !== expectedSignature) {
    console.error("Webhook: Signature mismatch for user", userId)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: { event: string; payload?: { payment?: { entity?: Record<string, unknown> } } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ received: true })
  }

  const payment = payload.payload?.payment?.entity
  if (!payment) {
    console.error("Webhook: No payment entity in payload")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const razorpayPaymentId = payment.id as string
  const amount = payment.amount as number // paise
  const currency = (payment.currency as string) ?? "INR"
  const notes = (payment.notes as Record<string, string>) ?? {}
  const donorName = notes.name ?? (payment.email as string) ?? "Anonymous"
  const donorEmail = (payment.email as string) ?? null
  const message = notes.message ?? null

  // Idempotency: check for duplicate
  const existing = await prisma.donation.findUnique({
    where: { razorpayPaymentId },
  })
  if (existing) {
    return NextResponse.json({ received: true })
  }

  // Save donation
  const donation = await prisma.donation.create({
    data: {
      userId: config.userId,
      razorpayPaymentId,
      donorName,
      donorEmail,
      amount,
      currency,
      message,
      status: "CAPTURED",
    },
  })

  // Check minimum donation
  const minAmount = config.minDonationAmount * 100 // convert INR to paise
  if (amount < minAmount) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { alertSent: true }, // Mark as "processed" but no alert
    })
    return NextResponse.json({ received: true })
  }

  if (!config.isActive || !config.streamlabsToken) {
    return NextResponse.json({ received: true })
  }

  // Send alert to Streamlabs
  try {
    const token = decrypt(config.streamlabsToken)
    const amountRupees = (amount / 100).toLocaleString("en-IN")
    const alertMessage = config.alertMessageTemplate
      .replace(/\{name\}/g, donorName)
      .replace(/\{amount\}/g, `₹${amountRupees}`)
      .replace(/\{message\}/g, message ?? "")

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

  return NextResponse.json({ received: true })
}
