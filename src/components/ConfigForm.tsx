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
    overlayAnimation: "slide" | "pop" | "bounce"
    overlaySoundUrl: string | null
    overlayVolume: number
    overlayDurationMs: number
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
  const [overlayAnimation, setOverlayAnimation] = useState<"slide" | "pop" | "bounce">(
    initialConfig?.overlayAnimation ?? "slide"
  )
  const [overlaySoundUrl, setOverlaySoundUrl] = useState<string | null>(
    initialConfig?.overlaySoundUrl ?? null
  )
  const [overlayVolume, setOverlayVolume] = useState<number>(
    initialConfig?.overlayVolume ?? 80
  )
  const [overlayDurationMs, setOverlayDurationMs] = useState<number>(
    initialConfig?.overlayDurationMs ?? 5000
  )
  const [uploadingSound, setUploadingSound] = useState(false)
  const [isActive, setIsActive] = useState(initialConfig?.isActive ?? true)

  function volumeToGain(volumePercent: number) {
    const normalized = Math.min(100, Math.max(0, Number(volumePercent) || 0)) / 100
    return Math.pow(normalized, 2)
  }

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
          overlayAnimation,
          overlaySoundUrl,
          overlayVolume,
          overlayDurationMs,
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

  async function handleSoundUpload(file: File) {
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file (mp3/wav/ogg).")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Audio file must be 2MB or smaller.")
      return
    }
    setUploadingSound(true)
    setError("")
    const reader = new FileReader()
    reader.onload = () => {
      setOverlaySoundUrl(typeof reader.result === "string" ? reader.result : null)
      setUploadingSound(false)
      setSuccess("Sound selected. Click Save Configuration to apply.")
    }
    reader.onerror = () => {
      setUploadingSound(false)
      setError("Failed to read audio file")
    }
    reader.readAsDataURL(file)
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

  async function handleShareDonateLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Donate link",
          text: "Support my stream",
          url: donateUrl,
        })
        return
      }
      await navigator.clipboard.writeText(donateUrl)
      setSuccess("Donate link copied!")
    } catch {
      // Clipboard can fail on insecure context on some mobile browsers.
      window.open(donateUrl, "_blank", "noopener,noreferrer")
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
                  onClick={handleShareDonateLink}
                >
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(donateUrl, "_blank", "noopener,noreferrer")}
                >
                  Open
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
          <div className="space-y-2">
            <Label htmlFor="animation">Alert Animation</Label>
            <select
              id="animation"
              value={overlayAnimation}
              onChange={(e) => setOverlayAnimation(e.target.value as "slide" | "pop" | "bounce")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="slide">Slide In</option>
              <option value="pop">Pop In</option>
              <option value="bounce">Bounce</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Alert Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              min={1.5}
              max={20}
              step={0.5}
              value={(overlayDurationMs / 1000).toString()}
              onChange={(e) => {
                const seconds = Number(e.target.value)
                if (!Number.isFinite(seconds)) return
                setOverlayDurationMs(Math.round(Math.min(20, Math.max(1.5, seconds)) * 1000))
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume">Alert Volume ({overlayVolume}%)</Label>
            <Input
              id="volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={overlayVolume}
              onChange={(e) => setOverlayVolume(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="soundUpload">Alert Sound (optional)</Label>
            <Input
              id="soundUpload"
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleSoundUpload(file)
              }}
              disabled={uploadingSound}
            />
            <p className="text-xs text-muted-foreground">
              Upload mp3/wav/ogg up to 2MB.
            </p>
            {overlaySoundUrl ? (
              <div className="flex items-center gap-2">
                <audio src={overlaySoundUrl} controls className="h-10" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const audio = new Audio(overlaySoundUrl)
                    const gain = volumeToGain(overlayVolume)
                    audio.volume = gain
                    audio.muted = gain === 0
                    void audio.play().catch(() => setError("Unable to play audio preview"))
                  }}
                >
                  Play Sound
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOverlaySoundUrl(null)}
                >
                  Remove Sound
                </Button>
              </div>
            ) : null}
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
