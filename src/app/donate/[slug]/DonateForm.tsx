"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string
      order_id: string
      handler: (response: { razorpay_payment_id: string }) => void
      prefill?: { name?: string; email?: string }
    }) => { open: () => void }
  }
}

interface DonateFormProps {
  slug: string
  streamerName: string
  minAmount: number
}

export function DonateForm({
  slug,
  streamerName,
  minAmount,
}: DonateFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [donorName, setDonorName] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt < minAmount) {
      setError(`Please enter at least ₹${minAmount}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/donate/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          amount: amt,
          donorName: donorName.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create payment")
        return
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        setError("Payment failed to load. Please refresh.")
        return
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        prefill: donorName ? { name: donorName } : undefined,
        handler: () => {
          router.push(`/donate/${slug}/thank-you`)
        },
      })
      rzp.open()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Donate to {streamerName} • Min ₹{minAmount}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min={minAmount}
              step="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name (optional)</Label>
            <Input
              id="name"
              placeholder="Anonymous"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              placeholder="Support message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Opening payment..." : `Donate ₹${amount || "—"}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
