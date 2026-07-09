import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  betStatusBadgeVariant,
  betStatusLabels,
  formatCurrency,
  sportsbookLabels,
} from "@/lib/bet-labels"
import type { Bet, BetLeg } from "@/generated/prisma/client"

type BetWithLegs = Bet & { legs: BetLeg[] }

function betTitle(bet: BetWithLegs) {
  if (bet.legs.length === 0) return "Bet"
  if (bet.legs.length === 1) return bet.legs[0].description
  return `${bet.legs[0].description} +${bet.legs.length - 1} more`
}

export function BetsTable({ bets }: { bets: BetWithLegs[] }) {
  if (bets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        No bets found. Try adjusting your filters, or{" "}
        <Link href="/bets/new" className="underline">
          log a new bet
        </Link>
        .
      </div>
    )
  }

  return (
    <>
      {/* Mobile: stacked cards, so stake/payout/status are never scrolled off-screen */}
      <div className="grid gap-2 sm:hidden">
        {bets.map((bet) => (
          <Link
            key={bet.id}
            href={`/bets/${bet.id}`}
            className="block rounded-lg border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {new Date(bet.placedAt).toLocaleDateString()} ·{" "}
                {sportsbookLabels[bet.sportsbook]}
              </span>
              <Badge variant={betStatusBadgeVariant[bet.status]}>
                {betStatusLabels[bet.status]}
              </Badge>
            </div>
            <p className="mt-1 truncate font-medium">{betTitle(bet)}</p>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {bet.legs.length} leg{bet.legs.length === 1 ? "" : "s"} · stake{" "}
                {formatCurrency(bet.stake)}
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(bet.actualPayout ?? bet.potentialPayout)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: full table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placed</TableHead>
              <TableHead>Sportsbook</TableHead>
              <TableHead>Bet</TableHead>
              <TableHead>Legs</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right">Payout</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bets.map((bet) => (
              <TableRow key={bet.id} className="cursor-pointer">
                <TableCell className="p-0">
                  <Link
                    href={`/bets/${bet.id}`}
                    className="block px-2 py-2 text-muted-foreground"
                  >
                    {new Date(bet.placedAt).toLocaleDateString()}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/bets/${bet.id}`} className="block px-2 py-2">
                    {sportsbookLabels[bet.sportsbook]}
                  </Link>
                </TableCell>
                <TableCell className="p-0 max-w-[280px]">
                  <Link
                    href={`/bets/${bet.id}`}
                    className="block truncate px-2 py-2"
                    title={betTitle(bet)}
                  >
                    {betTitle(bet)}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/bets/${bet.id}`} className="block px-2 py-2">
                    {bet.legs.length}
                  </Link>
                </TableCell>
                <TableCell className="p-0 text-right">
                  <Link href={`/bets/${bet.id}`} className="block px-2 py-2">
                    {formatCurrency(bet.stake)}
                  </Link>
                </TableCell>
                <TableCell className="p-0 text-right">
                  <Link href={`/bets/${bet.id}`} className="block px-2 py-2">
                    {formatCurrency(bet.actualPayout ?? bet.potentialPayout)}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link href={`/bets/${bet.id}`} className="block px-2 py-2">
                    <Badge variant={betStatusBadgeVariant[bet.status]}>
                      {betStatusLabels[bet.status]}
                    </Badge>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
