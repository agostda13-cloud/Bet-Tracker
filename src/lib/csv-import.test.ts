import { describe, expect, it } from "vitest"
import { autoDetectMapping, mapRowToBet } from "./csv-import"

describe("autoDetectMapping", () => {
  it("matches headers case-insensitively and ignoring punctuation", () => {
    const headers = ["Sportsbook", "Stake ($)", "To Win", "Date Placed", "Pick"]
    const mapping = autoDetectMapping(headers)
    expect(mapping.sportsbook).toBe("Sportsbook")
    expect(mapping.stake).toBe("Stake ($)")
    expect(mapping.potentialPayout).toBe("To Win")
    expect(mapping.placedAt).toBe("Date Placed")
    expect(mapping.legDescription).toBe("Pick")
  })

  it("leaves unmapped fields as an empty string when no header matches", () => {
    const mapping = autoDetectMapping(["Random Column"])
    expect(mapping.stake).toBe("")
  })
})

describe("mapRowToBet", () => {
  const mapping = {
    sportsbook: "Book",
    sport: "Sport",
    stake: "Stake",
    oddsAmerican: "",
    multiplier: "",
    potentialPayout: "Payout",
    actualPayout: "",
    status: "Result",
    placedAt: "Date",
    notes: "",
    legDescription: "Pick",
    legPlayer: "",
    legTeam: "",
    legPropType: "",
    legSelection: "",
    legLine: "",
    legOdds: "",
  }

  it("parses a well-formed row into bet form values", () => {
    const row = {
      Book: "Hard Rock",
      Sport: "NBA",
      Stake: "$50.00",
      Payout: "$95.45",
      Result: "Won",
      Date: "2026-01-01",
      Pick: "Lakers -4.5",
    }
    const result = mapRowToBet(row, mapping, 0)
    expect(result.errors).toEqual([])
    expect(result.values?.sportsbook).toBe("HARDROCK")
    expect(result.values?.stake).toBe(50)
    expect(result.values?.potentialPayout).toBe(95.45)
    expect(result.values?.status).toBe("WON")
    expect(result.values?.legs?.[0].description).toBe("Lakers -4.5")
  })

  it("fuzzy-matches sportsbook names", () => {
    const base = { Stake: "10", Payout: "20", Date: "2026-01-01", Pick: "x" }
    expect(mapRowToBet({ ...base, Book: "PrizePicks" }, mapping, 0).values?.sportsbook).toBe(
      "PRIZEPICKS"
    )
    expect(
      mapRowToBet({ ...base, Book: "DK Predictions" }, mapping, 0).values?.sportsbook
    ).toBe("DK_PREDICTIONS")
    expect(mapRowToBet({ ...base, Book: "Some Other Book" }, mapping, 0).values?.sportsbook).toBe(
      "OTHER"
    )
  })

  it("strips currency formatting from numbers", () => {
    const row = {
      Book: "x",
      Stake: "1,250.50",
      Payout: "$2,000",
      Date: "2026-01-01",
      Pick: "x",
    }
    const result = mapRowToBet(row, mapping, 0)
    expect(result.values?.stake).toBe(1250.5)
    expect(result.values?.potentialPayout).toBe(2000)
  })

  it("collects errors for missing required fields instead of throwing", () => {
    const result = mapRowToBet({ Book: "x" }, mapping, 3)
    expect(result.values).toBeNull()
    expect(result.rowIndex).toBe(3)
    expect(result.errors).toContain("Missing or invalid stake")
    expect(result.errors).toContain("Missing or invalid potential payout")
    expect(result.errors).toContain("Missing or invalid placed-at date")
    expect(result.errors).toContain("Missing leg description")
  })

  it("rejects a zero or negative stake", () => {
    const row = { Book: "x", Stake: "0", Payout: "10", Date: "2026-01-01", Pick: "x" }
    const result = mapRowToBet(row, mapping, 0)
    expect(result.errors).toContain("Missing or invalid stake")
  })

  it("defaults status to PENDING when unrecognized", () => {
    const row = {
      Book: "x",
      Stake: "10",
      Payout: "20",
      Date: "2026-01-01",
      Pick: "x",
      Result: "???",
    }
    expect(mapRowToBet(row, mapping, 0).values?.status).toBe("PENDING")
  })
})
