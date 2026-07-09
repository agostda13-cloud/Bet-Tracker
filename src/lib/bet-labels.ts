export const sportsbookLabels: Record<string, string> = {
  HARDROCK: "Hard Rock Bet",
  DK_PREDICTIONS: "DK Predictions",
  PRIZEPICKS: "PrizePicks",
  OTHER: "Other",
}

export const betStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  WON: "Won",
  LOST: "Lost",
  PUSH: "Push",
  CASHOUT: "Cashed Out",
  VOID: "Void",
}

export const legStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  WON: "Won",
  LOST: "Lost",
  PUSH: "Push",
  VOID: "Void",
}

export const betStatusBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  WON: "default",
  LOST: "destructive",
  PUSH: "secondary",
  CASHOUT: "secondary",
  VOID: "outline",
}

type Numberish = number | string | { toString(): string }

export function formatOdds(odds: Numberish | null | undefined) {
  if (odds === null || odds === undefined) return null
  const n = Number(odds)
  return n > 0 ? `+${n}` : `${n}`
}

export function formatCurrency(value: Numberish | null | undefined) {
  if (value === null || value === undefined) return "-"
  const n = Number(value)
  if (Number.isNaN(n)) return "-"
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
