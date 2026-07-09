import Link from "next/link"
import { auth } from "@/auth"
import { getBets } from "@/lib/bets"
import { BetsTable } from "@/components/bets/bets-table"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  const bets = await getBets(session!.user.id)
  const recent = bets.slice(0, 8)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/bets/new" />}>
          <PlusIcon /> New bet
        </Button>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Recent bets</h2>
        <BetsTable bets={recent} />
      </div>
    </div>
  )
}
