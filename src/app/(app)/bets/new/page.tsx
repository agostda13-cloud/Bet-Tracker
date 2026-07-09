import { BetForm } from "@/components/bets/bet-form"

export default function NewBetPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">New bet</h1>
      <BetForm mode="create" />
    </div>
  )
}
