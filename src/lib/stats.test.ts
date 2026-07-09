import { describe, expect, it } from "vitest"
import {
  betProfit,
  computeSummary,
  cumulativeProfitByDay,
  groupStats,
  type StatBet,
} from "./stats"

function bet(overrides: Partial<StatBet>): StatBet {
  return {
    id: "1",
    stake: 100,
    actualPayout: null,
    potentialPayout: 200,
    status: "PENDING",
    sportsbook: "HARDROCK",
    sport: "NBA",
    placedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }
}

describe("betProfit", () => {
  it("computes profit for a win using actualPayout when set", () => {
    expect(
      betProfit(bet({ status: "WON", stake: 100, actualPayout: 250 }))
    ).toBe(150)
  })

  it("falls back to potentialPayout for a win with no actualPayout", () => {
    expect(
      betProfit(
        bet({ status: "WON", stake: 100, potentialPayout: 300, actualPayout: null })
      )
    ).toBe(200)
  })

  it("loses the full stake on a loss", () => {
    expect(betProfit(bet({ status: "LOST", stake: 75 }))).toBe(-75)
  })

  it("is a wash on push and void", () => {
    expect(betProfit(bet({ status: "PUSH", stake: 50 }))).toBe(0)
    expect(betProfit(bet({ status: "VOID", stake: 50 }))).toBe(0)
  })

  it("is zero for a pending bet", () => {
    expect(betProfit(bet({ status: "PENDING", stake: 50 }))).toBe(0)
  })

  it("uses actualPayout minus stake for cashout", () => {
    expect(
      betProfit(bet({ status: "CASHOUT", stake: 100, actualPayout: 60 }))
    ).toBe(-40)
  })
})

describe("computeSummary", () => {
  it("excludes pending bets from staked/profit/ROI but tracks them separately", () => {
    const bets = [
      bet({ status: "WON", stake: 100, actualPayout: 190 }),
      bet({ status: "LOST", stake: 50 }),
      bet({ status: "PENDING", stake: 30 }),
    ]
    const summary = computeSummary(bets)
    expect(summary.totalBets).toBe(3)
    expect(summary.pendingCount).toBe(1)
    expect(summary.pendingStake).toBe(30)
    expect(summary.totalStaked).toBe(150)
    expect(summary.totalProfit).toBe(40) // +90 - 50
    expect(summary.roi).toBeCloseTo(40 / 150)
  })

  it("computes win rate only from won/lost, excluding push/void/cashout", () => {
    const bets = [
      bet({ status: "WON", stake: 10, actualPayout: 20 }),
      bet({ status: "WON", stake: 10, actualPayout: 20 }),
      bet({ status: "LOST", stake: 10 }),
      bet({ status: "PUSH", stake: 10 }),
      bet({ status: "VOID", stake: 10 }),
    ]
    const summary = computeSummary(bets)
    expect(summary.wins).toBe(2)
    expect(summary.losses).toBe(1)
    expect(summary.winRate).toBeCloseTo(2 / 3)
  })

  it("returns null win rate when there are no decided bets", () => {
    const summary = computeSummary([bet({ status: "PENDING" })])
    expect(summary.winRate).toBeNull()
  })

  it("computes the current streak from the most recent settled bets", () => {
    const bets = [
      bet({ status: "WON", placedAt: new Date("2026-01-01") }),
      bet({ status: "LOST", placedAt: new Date("2026-01-02") }),
      bet({ status: "WON", placedAt: new Date("2026-01-03") }),
      bet({ status: "WON", placedAt: new Date("2026-01-04") }),
    ]
    const summary = computeSummary(bets)
    expect(summary.currentStreak).toEqual({ type: "WON", count: 2 })
  })

  it("breaks the streak on push/void without resetting to zero incorrectly", () => {
    const bets = [
      bet({ status: "LOST", placedAt: new Date("2026-01-01") }),
      bet({ status: "WON", placedAt: new Date("2026-01-02") }),
      bet({ status: "PUSH", placedAt: new Date("2026-01-03") }),
    ]
    const summary = computeSummary(bets)
    expect(summary.currentStreak).toEqual({ type: "WON", count: 1 })
  })
})

describe("groupStats", () => {
  it("groups by key and computes per-group ROI and win rate", () => {
    const bets = [
      bet({ sportsbook: "HARDROCK", status: "WON", stake: 100, actualPayout: 200 }),
      bet({ sportsbook: "HARDROCK", status: "LOST", stake: 50 }),
      bet({ sportsbook: "PRIZEPICKS", status: "WON", stake: 20, actualPayout: 60 }),
    ]
    const groups = groupStats(bets, (b) => b.sportsbook)
    const hardrock = groups.find((g) => g.key === "HARDROCK")!
    const prizepicks = groups.find((g) => g.key === "PRIZEPICKS")!

    expect(hardrock.count).toBe(2)
    expect(hardrock.totalStaked).toBe(150)
    expect(hardrock.totalProfit).toBe(50) // +100 - 50
    expect(hardrock.winRate).toBeCloseTo(0.5)

    expect(prizepicks.count).toBe(1)
    expect(prizepicks.totalProfit).toBe(40)
  })

  it("skips bets whose key function returns null", () => {
    const bets = [bet({ sport: null }), bet({ sport: "NBA" })]
    const groups = groupStats(bets, (b) => b.sport)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe("NBA")
  })
})

describe("cumulativeProfitByDay", () => {
  it("accumulates profit across days in chronological order", () => {
    const bets = [
      bet({ status: "WON", stake: 10, actualPayout: 20, placedAt: new Date("2026-01-02") }),
      bet({ status: "LOST", stake: 5, placedAt: new Date("2026-01-01") }),
      bet({ status: "WON", stake: 10, actualPayout: 15, placedAt: new Date("2026-01-01") }),
    ]
    const series = cumulativeProfitByDay(bets)
    expect(series).toEqual([
      { date: "2026-01-01", profit: 0, cumulativeProfit: 0 }, // +5 - 5
      { date: "2026-01-02", profit: 10, cumulativeProfit: 10 },
    ])
  })

  it("excludes pending bets", () => {
    const bets = [bet({ status: "PENDING", placedAt: new Date("2026-01-01") })]
    expect(cumulativeProfitByDay(bets)).toEqual([])
  })
})
