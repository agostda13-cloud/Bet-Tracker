import Link from "next/link"
import { auth } from "@/auth"
import { getBets, getStatBets } from "@/lib/bets"
import { computeSummary, cumulativeProfitByDay, groupStats } from "@/lib/stats"
import { BetsTable } from "@/components/bets/bets-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatTile } from "@/components/dashboard/stat-tile"
import { PnlChart } from "@/components/dashboard/pnl-chart"
import { BreakdownBarChart } from "@/components/dashboard/breakdown-bar-chart"
import { formatCurrency, sportsbookLabels } from "@/lib/bet-labels"
import { PlusIcon } from "lucide-react"

const MAX_SPORT_ROWS = 6

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const [statBets, recentBets] = await Promise.all([
    getStatBets(userId),
    getBets(userId),
  ])

  const summary = computeSummary(statBets)
  const pnlSeries = cumulativeProfitByDay(statBets)

  const bySportsbook = groupStats(statBets, (b) => b.sportsbook).map((g) => ({
    label: sportsbookLabels[g.key] ?? g.key,
    profit: g.totalProfit,
    count: g.count,
  }))

  const sportGroups = groupStats(statBets, (b) => b.sport)
  const bySport =
    sportGroups.length > MAX_SPORT_ROWS
      ? [
          ...sportGroups.slice(0, MAX_SPORT_ROWS - 1).map((g) => ({
            label: g.key,
            profit: g.totalProfit,
            count: g.count,
          })),
          {
            label: "Other",
            profit: sportGroups
              .slice(MAX_SPORT_ROWS - 1)
              .reduce((sum, g) => sum + g.totalProfit, 0),
            count: sportGroups
              .slice(MAX_SPORT_ROWS - 1)
              .reduce((sum, g) => sum + g.count, 0),
          },
        ]
      : sportGroups.map((g) => ({
          label: g.key,
          profit: g.totalProfit,
          count: g.count,
        }))

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/bets/new" />}>
          <PlusIcon /> New bet
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Total P&L"
          value={formatCurrency(summary.totalProfit)}
          tone={summary.totalProfit > 0 ? "positive" : summary.totalProfit < 0 ? "negative" : "neutral"}
          sub={`${summary.settledCount} settled bet${summary.settledCount === 1 ? "" : "s"}`}
        />
        <StatTile
          label="ROI"
          value={`${(summary.roi * 100).toFixed(1)}%`}
          tone={summary.roi > 0 ? "positive" : summary.roi < 0 ? "negative" : "neutral"}
          sub={`${formatCurrency(summary.totalStaked)} staked`}
        />
        <StatTile
          label="Win rate"
          value={summary.winRate === null ? "-" : `${(summary.winRate * 100).toFixed(0)}%`}
          sub={`${summary.wins}-${summary.losses}`}
        />
        <StatTile
          label="Pending exposure"
          value={formatCurrency(summary.pendingStake)}
          sub={`${summary.pendingCount} pending bet${summary.pendingCount === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cumulative profit</CardTitle>
        </CardHeader>
        <CardContent>
          <PnlChart data={pnlSeries} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>P&L by sportsbook</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart data={bySportsbook} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>P&L by sport</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart data={bySport} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Recent bets</h2>
        <BetsTable bets={recentBets.slice(0, 8)} />
      </div>
    </div>
  )
}
