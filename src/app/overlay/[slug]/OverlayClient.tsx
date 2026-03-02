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

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default function OverlayClient({ slug }: { slug: string }) {
  const [queue, setQueue] = useState<OverlayEvent[]>([])
  const [current, setCurrent] = useState<OverlayEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const afterRef = useRef<number>(Date.now())
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/overlay/events?slug=${encodeURIComponent(slug)}&after=${afterRef.current}`,
          { cache: "no-store" }
        )
        if (!res.ok) return
        const data = (await res.json()) as { events?: OverlayEvent[] }
        const events = data.events ?? []
        if (events.length > 0 && !cancelled) {
          setQueue((prev) => [...prev, ...events])
          afterRef.current = Math.max(
            ...events.map((e) => e.createdAtMs),
            afterRef.current
          )
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

    const hideTimer = setTimeout(() => setVisible(false), 5000)
    const clearTimer = setTimeout(() => {
      setCurrent(null)
      busyRef.current = false
    }, 5700)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(clearTimer)
    }
  }, [queue, current])

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative">
      <div
        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 ${
          visible ? "top-10 opacity-100" : "top-0 opacity-0"
        }`}
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
