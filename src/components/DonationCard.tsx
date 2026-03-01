import { formatAmount } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface DonationCardProps {
  donorName: string
  amount: number
  message?: string | null
  createdAt: Date
}

export function DonationCard({
  donorName,
  amount,
  message,
  createdAt,
}: DonationCardProps) {
  const date = new Date(createdAt)
  const timeAgo = getTimeAgo(date)

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{donorName}</p>
          {message && (
            <p className="text-sm text-muted-foreground truncate">{message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-primary">{formatAmount(amount)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
