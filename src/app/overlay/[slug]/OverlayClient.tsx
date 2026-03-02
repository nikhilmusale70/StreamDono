"use client"

import { useEffect, useRef, useState } from "react"

type OverlayEvent = {
  id: string
  donorName: string
  amount: number
  message: string | null
  createdAtMs: number
  isTest: boolean
}

type OverlaySettings = {
  animation: "slide" | "pop" | "bounce"
  soundUrl: string | null
  durationMs: number
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default function OverlayClient({ slug }: { slug: string }) {
  const [queue, setQueue] = useState<OverlayEvent[]>([])
  const [current, setCurrent] = useState<OverlayEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<OverlaySettings>({
    animation: "slide",
    soundUrl: null,
    durationMs: 5000,
  })
  const afterRef = useRef<number>(Date.now())
  const busyRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Force transparent page in browser sources.
    document.documentElement.style.background = "transparent"
    document.body.style.background = "transparent"
    document.body.style.margin = "0"
    return () => {
      document.documentElement.style.background = ""
      document.body.style.background = ""
      document.body.style.margin = ""
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/overlay/events?slug=${encodeURIComponent(slug)}&after=${afterRef.current}`,
          { cache: "no-store" }
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          events?: OverlayEvent[]
          settings?: OverlaySettings
        }
        const events = (data.events ?? []).filter((e) => !seenIdsRef.current.has(e.id))
        if (data.settings) {
          setSettings({
            animation: data.settings.animation ?? "slide",
            soundUrl: data.settings.soundUrl ?? null,
            durationMs: data.settings.durationMs ?? 5000,
          })
        }
        if (events.length > 0 && !cancelled) {
          for (const e of events) seenIdsRef.current.add(e.id)
          setQueue((prev) => [...prev, ...events])
          afterRef.current = Math.max(
            ...events.map((e) => e.createdAtMs),
            afterRef.current
          ) + 1
        }
      } catch {
        // ignore transient polling errors
      }
    }

    const id = setInterval(poll, 2000)
    poll()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [slug])

  useEffect(() => {
    if (busyRef.current || current || queue.length === 0) return
    busyRef.current = true
    const next = queue[0]
    setQueue((prev) => prev.slice(1))
    setCurrent(next)
    setVisible(true)
  }, [queue, current])

  useEffect(() => {
    if (!current) return

    if (settings.soundUrl) {
      const audio = new Audio(settings.soundUrl)
      audio.volume = 0.8
      audioRef.current = audio
      void audio.play().catch(() => {})
    }

    const duration = Math.max(1500, settings.durationMs ?? 5000)
    const hideTimer = setTimeout(() => setVisible(false), duration)
    const clearTimer = setTimeout(() => {
      setCurrent(null)
      busyRef.current = false
      audioRef.current?.pause()
    }, duration + 700)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(clearTimer)
      audioRef.current?.pause()
    }
  }, [current, settings.soundUrl, settings.durationMs])

  const animationClass = (() => {
    if (!visible) return "opacity-0 translate-y-[-20px] scale-95"
    if (settings.animation === "pop") return "opacity-100 translate-y-0 scale-100"
    if (settings.animation === "bounce") return "opacity-100 translate-y-0 scale-100 animate-bounce"
    return "opacity-100 translate-y-0 scale-100"
  })()

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "transparent" }}>
      <div
        className={`absolute left-1/2 -translate-x-1/2 top-10 transition-all duration-500 ${animationClass}`}
      >
        {current && (
          <div className="min-w-[560px] max-w-[860px] rounded-2xl border border-emerald-300/60 bg-slate-900/95 shadow-2xl backdrop-blur px-8 py-6">
            <p className="text-emerald-300 text-sm uppercase tracking-widest">
              {current.isTest ? "Test Alert" : "New Donation"}
            </p>
            <p className="mt-2 text-4xl font-bold text-white">
              {current.donorName}
            </p>
            <p className="mt-1 text-3xl font-semibold text-emerald-400">
              {formatAmount(current.amount)}
            </p>
            {current.message ? (
              <p className="mt-3 text-xl text-slate-100">"{current.message}"</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
