"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, LayoutDashboard, Gift, Shield } from "lucide-react"

interface DashboardHeaderProps {
  userName?: string | null
  isAdmin?: boolean
}

export function DashboardHeader({ userName, isAdmin = false }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            StreamDonations
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/donations"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Gift className="h-4 w-4" />
              Donations
            </Link>
            <Link
              href="/dashboard/config"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
              Config
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userName}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
