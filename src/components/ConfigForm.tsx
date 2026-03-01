"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ConfigFormProps {
  initialConfig: {
    streamlabsTokenSet: boolean
    razorpayLink: string
    webhookSecretSet: boolean
    minDonationAmount: number
    alertMessageTemplate: string
    isActive: boolean
  } | null
  webhookUrl: string
}

export function ConfigForm({ initialConfig, webhookUrl }: ConfigFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [streamlabsToken, setStreamlabsToken] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [razorpayLink, setRazorpayLink] = useState(
    initialConfig?.razorpayLink ?? ""
  )
  const [minDonationAmount, setMinDonationAmount] = useState(
    initialConfig?.minDonationAmount ?? 10
  )
  const [alertMessageTemplate, setAlertMessageTemplate] = useState(
    initialConfig?.alertMessageTemplate ?? "{name} donated ₹{amount}"
  )
  const [isActive, setIsActive] = useState(initialConfig?.isActive ?? true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamlabsToken: streamlabsToken || undefined,
          razorpayLink: razorpayLink || undefined,
          webhookSecret: webhookSecret || undefined,
          minDonationAmount,
          alertMessageTemplate,
          isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save")
        return
      }
      setSuccess("Configuration saved!")
      if (streamlabsToken) setStreamlabsToken("")
      if (webhookSecret) setWebhookSecret("")
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleTestAlert() {
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/config/test", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setSuccess("Test alert sent! Check your Streamlabs/OBS.")
      } else {
        setError(data.error || "Test failed")
      }
    } catch {
      setError("Failed to send test alert")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Streamlabs</CardTitle>
          <CardDescription>
            Get your Socket API Token from Streamlabs Dashboard → API Settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="streamlabs">Socket API Token</Label>
            <Input
              id="streamlabs"
              type="password"
              placeholder={
                initialConfig?.streamlabsTokenSet
                  ? "•••••••• (leave blank to keep existing)"
                  : "Paste your token here"
              }
              value={streamlabsToken}
              onChange={(e) => setStreamlabsToken(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Razorpay</CardTitle>
          <CardDescription>
            Your razorpay.me payment link (e.g. razorpay.me/yourname)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razorpay">Payment Link</Label>
            <Input
              id="razorpay"
              type="url"
              placeholder="https://razorpay.me/yourname"
              value={razorpayLink}
              onChange={(e) => setRazorpayLink(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL (add this in Razorpay Dashboard)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Razorpay Dashboard → Settings → Webhooks → Add endpoint. Select
              &quot;payment.captured&quot; event.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder={
                initialConfig?.webhookSecretSet
                  ? "•••••••• (leave blank to keep existing)"
                  : "Paste from Razorpay after adding webhook"
              }
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              After adding the webhook URL in Razorpay, they show a secret. Paste it here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Settings</CardTitle>
          <CardDescription>
            Customize how donation alerts appear on stream
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Alert Message Template</Label>
            <Input
              id="template"
              placeholder="{name} donated ₹{amount}"
              value={alertMessageTemplate}
              onChange={(e) => setAlertMessageTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Variables: {"{name}"}, {"{amount}"}, {"{message}"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minAmount">Minimum Donation (INR)</Label>
            <Input
              id="minAmount"
              type="number"
              min={0}
              value={minDonationAmount}
              onChange={(e) => setMinDonationAmount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="isActive">Alerts enabled</Label>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-md">
          {success}
        </p>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Configuration"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleTestAlert}
          disabled={!initialConfig?.streamlabsTokenSet && !streamlabsToken}
        >
          Send Test Alert
        </Button>
      </div>
    </form>
  )
}
