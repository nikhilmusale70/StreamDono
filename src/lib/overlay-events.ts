type OverlayTestEvent = {
  id: string
  userId: string
  donorName: string
  amount: number
  message: string | null
  createdAtMs: number
}

const testEventsByUser = new Map<string, OverlayTestEvent[]>()

export function enqueueOverlayTestEvent(userId: string) {
  const now = Date.now()
  const event: OverlayTestEvent = {
    id: `test_${now}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    donorName: "Test Donor",
    amount: 10000, // paise => Rs.100
    message: "This is a test alert",
    createdAtMs: now,
  }
  const list = testEventsByUser.get(userId) ?? []
  list.push(event)
  testEventsByUser.set(userId, list)
  return event
}

export function getOverlayTestEvents(userId: string, afterMs: number) {
  const list = testEventsByUser.get(userId) ?? []
  const events = list.filter((e) => e.createdAtMs > afterMs)
  // Keep only recent events in memory.
  const cutoff = Date.now() - 10 * 60 * 1000
  testEventsByUser.set(
    userId,
    list.filter((e) => e.createdAtMs >= cutoff)
  )
  return events
}
