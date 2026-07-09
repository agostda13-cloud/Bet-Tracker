import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { getBetById } from "@/lib/bets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BetDeleteButton } from "@/components/bets/bet-delete-button"
import {
  betStatusBadgeVariant,
  betStatusLabels,
  formatCurrency,
  formatOdds,
  legStatusLabels,
  sportsbookLabels,
} from "@/lib/bet-labels"
import { PencilIcon } from "lucide-react"

type PageProps = { params: Promise<{ id: string }> }

export default async function BetDetailPage({ params }: PageProps) {
  const session = await auth()
  const { id } = await params
  const bet = await getBetById(session!.user.id, id)
  if (!bet) notFound()

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {sportsbookLabels[bet.sportsbook]}
            {bet.sport ? ` · ${bet.sport}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            Placed {new Date(bet.placedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/bets/${bet.id}/edit`} />}
          >
            <PencilIcon /> Edit
          </Button>
          <BetDeleteButton betId={bet.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <Badge variant={betStatusBadgeVariant[bet.status]}>
              {betStatusLabels[bet.status]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Stake</p>
            <p className="font-medium">{formatCurrency(bet.stake)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Potential payout</p>
            <p className="font-medium">{formatCurrency(bet.potentialPayout)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Actual payout</p>
            <p className="font-medium">{formatCurrency(bet.actualPayout)}</p>
          </div>
          {bet.oddsAmerican !== null && (
            <div>
              <p className="text-muted-foreground text-xs">Odds</p>
              <p className="font-medium">{formatOdds(Number(bet.oddsAmerican))}</p>
            </div>
          )}
          {bet.multiplier !== null && (
            <div>
              <p className="text-muted-foreground text-xs">Multiplier</p>
              <p className="font-medium">{Number(bet.multiplier)}x</p>
            </div>
          )}
          {bet.settledAt && (
            <div>
              <p className="text-muted-foreground text-xs">Settled</p>
              <p className="font-medium">
                {new Date(bet.settledAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legs ({bet.legs.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {bet.legs.map((leg) => (
            <div
              key={leg.id}
              className="flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{leg.description}</p>
                <p className="text-muted-foreground text-sm">
                  {[leg.player, leg.team, leg.propType, leg.selection]
                    .filter(Boolean)
                    .join(" · ")}
                  {leg.line !== null ? ` · Line ${Number(leg.line)}` : ""}
                  {leg.odds !== null ? ` · ${formatOdds(leg.odds)}` : ""}
                </p>
              </div>
              <Badge variant={betStatusBadgeVariant[leg.status] ?? "outline"}>
                {legStatusLabels[leg.status]}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {bet.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{bet.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
