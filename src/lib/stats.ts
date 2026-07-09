export type StatStatus = "PENDING" | "WON" | "LOST" | "PUSH" | "CASHOUT" | "VOID"

export type StatBet = {
  id: string
  stake: number
  actualPayout: number | null
  potentialPayout: number
  status: StatStatus
  sportsbook: string
  sport: string | null
  placedAt: Date
}

export function betProfit(bet: StatBet): number {
  switch (bet.status) {
    case "WON":
      return (bet.actualPayout ?? bet.potentialPayout) - bet.stake
    case "LOST":
      return -bet.stake
    case "CASHOUT":
      return (bet.actualPayout ?? 0) - bet.stake
    case "PUSH":
    case "VOID":
    case "PENDING":
      return 0
  }
}

export function isSettled(bet: StatBet): boolean {
  return bet.status !== "PENDING"
}

export function isWinLoss(bet: StatBet): boolean {
  return bet.status === "WON" || bet.status === "LOST"
}

export type SummaryStats = {
  totalBets: number
  settledCount: number
  pendingCount: number
  pendingStake: number
  totalStaked: number
  totalProfit: number
  roi: number
  wins: number
  losses: number
  winRate: number | null
  currentStreak: { type: "WON" | "LOST"; count: number } | null
}

export function computeSummary(bets: StatBet[]): SummaryStats {
  const settled = bets.filter(isSettled)
  const pending = bets.filter((b) => b.status === "PENDING")

  const totalStaked = settled.reduce((sum, b) => sum + b.stake, 0)
  const totalProfit = settled.reduce((sum, b) => sum + betProfit(b), 0)
  const wins = settled.filter((b) => b.status === "WON").length
  const losses = settled.filter((b) => b.status === "LOST").length

  const chronological = [...settled]
    .filter(isWinLoss)
    .sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime())

  let currentStreak: SummaryStats["currentStreak"] = null
  for (let i = chronological.length - 1; i >= 0; i--) {
    const s = chronological[i].status as "WON" | "LOST"
    if (!currentStreak) {
      currentStreak = { type: s, count: 1 }
    } else if (currentStreak.type === s) {
      currentStreak.count += 1
    } else {
      break
    }
  }

  return {
    totalBets: bets.length,
    settledCount: settled.length,
    pendingCount: pending.length,
    pendingStake: pending.reduce((sum, b) => sum + b.stake, 0),
    totalStaked,
    totalProfit,
    roi: totalStaked > 0 ? totalProfit / totalStaked : 0,
    wins,
    losses,
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    currentStreak,
  }
}

export type GroupStats = {
  key: string
  count: number
  totalStaked: number
  totalProfit: number
  roi: number
  winRate: number | null
}

export function groupStats(
  bets: StatBet[],
  keyFn: (bet: StatBet) => string | null
): GroupStats[] {
  const groups = new Map<string, StatBet[]>()
  for (const bet of bets) {
    const key = keyFn(bet)
    if (key === null) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(bet)
  }

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const settled = group.filter(isSettled)
      const totalStaked = settled.reduce((sum, b) => sum + b.stake, 0)
      const totalProfit = settled.reduce((sum, b) => sum + betProfit(b), 0)
      const wins = settled.filter((b) => b.status === "WON").length
      const losses = settled.filter((b) => b.status === "LOST").length
      return {
        key,
        count: group.length,
        totalStaked,
        totalProfit,
        roi: totalStaked > 0 ? totalProfit / totalStaked : 0,
        winRate: wins + losses > 0 ? wins / (wins + losses) : null,
      }
    })
    .sort((a, b) => b.count - a.count)
}

export type TimeSeriesPoint = {
  date: string
  profit: number
  cumulativeProfit: number
}

export function cumulativeProfitByDay(bets: StatBet[]): TimeSeriesPoint[] {
  const settled = bets
    .filter(isSettled)
    .sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime())

  const byDay = new Map<string, number>()
  for (const bet of settled) {
    const day = bet.placedAt.toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + betProfit(bet))
  }

  const days = Array.from(byDay.keys()).sort()
  let cumulative = 0
  return days.map((date) => {
    const profit = byDay.get(date)!
    cumulative += profit
    return { date, profit, cumulativeProfit: cumulative }
  })
}
