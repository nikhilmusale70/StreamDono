import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardHeader } from "@/components/DashboardHeader"
import { isAdminEmail } from "@/lib/admin"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")
  const isAdmin = isAdminEmail(session.user?.email)

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader userName={session.user?.name} isAdmin={isAdmin} />
      <main className="container py-6">{children}</main>
    </div>
  )
}
