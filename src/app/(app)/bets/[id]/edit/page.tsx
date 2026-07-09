import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { getBetById } from "@/lib/bets"
import { BetForm } from "@/components/bets/bet-form"
import type { BetFormValues } from "@/lib/validations/bet"

type PageProps = { params: Promise<{ id: string }> }

export default async function EditBetPage({ params }: PageProps) {
  const session = await auth()
  const { id } = await params
  const bet = await getBetById(session!.user.id, id)
  if (!bet) notFound()

  const defaultValues: Partial<BetFormValues> = {
    sportsbook: bet.sportsbook,
    stake: Number(bet.stake),
    oddsAmerican: bet.oddsAmerican,
    multiplier: bet.multiplier ? Number(bet.multiplier) : null,
    potentialPayout: Number(bet.potentialPayout),
    actualPayout: bet.actualPayout ? Number(bet.actualPayout) : null,
    status: bet.status,
    placedAt: bet.placedAt.toISOString(),
    settledAt: bet.settledAt ? bet.settledAt.toISOString() : "",
    sport: bet.sport ?? "",
    notes: bet.notes ?? "",
    legs: bet.legs.map((leg) => ({
      description: leg.description,
      player: leg.player ?? "",
      team: leg.team ?? "",
      propType: leg.propType ?? "",
      line: leg.line ? Number(leg.line) : null,
      selection: leg.selection ?? "",
      odds: leg.odds,
      status: leg.status,
    })),
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Edit bet</h1>
      <BetForm mode="edit" betId={bet.id} defaultValues={defaultValues} />
    </div>
  )
}
