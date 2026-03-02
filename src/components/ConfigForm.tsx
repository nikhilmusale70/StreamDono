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
    donateSlug: string
    minDonationAmount: number
    alertMessageTemplate: string
    isActive: boolean
  } | null
  donateUrl: string
}

export function ConfigForm({ initialConfig, donateUrl }: ConfigFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [donateSlug, setDonateSlug] = useState(
    initialConfig?.donateSlug ?? ""
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
          donateSlug: donateSlug || undefined,
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
        setSuccess("Test alert queued! Check your overlay source.")
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
          <CardTitle>Your Donate Page</CardTitle>
          <CardDescription>
            Choose a unique URL slug. Share this link with your viewers — they can enter any amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="donateSlug">URL Slug</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">/donate/</span>
              <Input
                id="donateSlug"
                placeholder="your-name"
                value={donateSlug}
                onChange={(e) => setDonateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use only lowercase letters, numbers, hyphens (e.g. nikhil-streams)
            </p>
          </div>
          {donateSlug && (
            <div className="space-y-2">
              <Label>Your donate link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={donateUrl}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(donateUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Overlay</CardTitle>
          <CardDescription>
            Use the OBS Overlay URL below this form as a Browser Source to display live alerts.
          </CardDescription>
        </CardHeader>
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
          disabled={!isActive}
        >
          Send Test Alert
        </Button>
      </div>
    </form>
  )
}
