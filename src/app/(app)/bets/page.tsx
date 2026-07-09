import Link from "next/link"
import { Suspense } from "react"
import { auth } from "@/auth"
import { getBets, getDistinctSports } from "@/lib/bets"
import { BetsFilterBar } from "@/components/bets/bets-filter-bar"
import { BetsTable } from "@/components/bets/bets-table"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BetsPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams
  const filters = {
    sportsbook: typeof params.sportsbook === "string" ? params.sportsbook : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    sport: typeof params.sport === "string" ? params.sport : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
  }

  const [bets, sports] = await Promise.all([
    getBets(session!.user.id, filters),
    getDistinctSports(session!.user.id),
  ])

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bets</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/bets/new" />}>
          <PlusIcon /> New bet
        </Button>
      </div>
      <Suspense>
        <BetsFilterBar sports={sports} />
      </Suspense>
      <BetsTable bets={bets} />
    </div>
  )
}
