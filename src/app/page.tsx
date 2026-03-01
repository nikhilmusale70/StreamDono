import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { IndianRupee, Zap, BarChart3, Shield } from "lucide-react"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="container flex h-16 items-center justify-between">
        <span className="font-bold text-xl">StreamDonations</span>
        <nav className="flex gap-4">
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="container py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold tracking-tight">
            Razorpay to Streamlabs.
            <br />
            <span className="text-primary">One Platform.</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Accept INR donations via Razorpay and display real-time alerts on
            Streamlabs. Built for Indian streamers.
          </p>
          <div className="flex gap-4 justify-center">
            {session ? (
              <Button asChild size="lg">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/register">Get Started Free</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-xl bg-background/80 border shadow-sm">
            <IndianRupee className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-semibold text-lg">Razorpay Integration</h3>
            <p className="text-muted-foreground mt-2">
              Use your razorpay.me link. Viewers pay in INR. No PayPal or Stripe needed.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-background/80 border shadow-sm">
            <Zap className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-semibold text-lg">Real-time Alerts</h3>
            <p className="text-muted-foreground mt-2">
              Donations trigger Streamlabs alerts instantly. Customize messages.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-background/80 border shadow-sm">
            <BarChart3 className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-semibold text-lg">Analytics Dashboard</h3>
            <p className="text-muted-foreground mt-2">
              Track donations, top donors, and export data. All in one place.
            </p>
          </div>
        </div>

        <div className="mt-24 p-8 rounded-xl bg-muted/50 border text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Secure. Webhook signature verification. Encrypted tokens. GDPR-ready.
          </p>
        </div>
      </main>
    </div>
  )
}
