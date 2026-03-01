import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const donations = await prisma.donation.findMany({
    where: { userId: session.user.id, status: "CAPTURED" },
    orderBy: { createdAt: "desc" },
  })

  const csv = [
    "Date,Donor Name,Donor Email,Amount (INR),Message",
    ...donations.map(
      (d) =>
        `${d.createdAt.toISOString()},"${(d.donorName ?? "Anonymous").replace(/"/g, '""')}","${(d.donorEmail ?? "").replace(/"/g, '""')}",${d.amount / 100},"${(d.message ?? "").replace(/"/g, '""')}"`
    ),
  ].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="donations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
