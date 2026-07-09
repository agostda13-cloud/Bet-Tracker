import {
  betStatusValues,
  legStatusValues,
  sportsbookValues,
  type BetFormValues,
} from "@/lib/validations/bet"

export type CsvTargetField = {
  key: string
  label: string
  required: boolean
  group: "bet" | "leg"
}

export const CSV_TARGET_FIELDS: CsvTargetField[] = [
  { key: "sportsbook", label: "Sportsbook", required: true, group: "bet" },
  { key: "sport", label: "Sport / League", required: false, group: "bet" },
  { key: "stake", label: "Stake", required: true, group: "bet" },
  { key: "oddsAmerican", label: "Odds (American)", required: false, group: "bet" },
  { key: "multiplier", label: "Multiplier", required: false, group: "bet" },
  { key: "potentialPayout", label: "Potential payout", required: true, group: "bet" },
  { key: "actualPayout", label: "Actual payout", required: false, group: "bet" },
  { key: "status", label: "Status", required: false, group: "bet" },
  { key: "placedAt", label: "Placed at (date)", required: true, group: "bet" },
  { key: "notes", label: "Notes", required: false, group: "bet" },
  { key: "legDescription", label: "Leg: Description", required: true, group: "leg" },
  { key: "legPlayer", label: "Leg: Player", required: false, group: "leg" },
  { key: "legTeam", label: "Leg: Team", required: false, group: "leg" },
  { key: "legPropType", label: "Leg: Prop type", required: false, group: "leg" },
  { key: "legSelection", label: "Leg: Selection", required: false, group: "leg" },
  { key: "legLine", label: "Leg: Line", required: false, group: "leg" },
  { key: "legOdds", label: "Leg: Odds", required: false, group: "leg" },
]

export type ColumnMapping = Record<string, string> // targetField key -> CSV header (or "" for unmapped)

const HEADER_ALIASES: Record<string, string[]> = {
  sportsbook: ["sportsbook", "book", "app", "platform"],
  sport: ["sport", "league"],
  stake: ["stake", "wager", "amount", "risk"],
  oddsAmerican: ["odds", "americanodds", "line odds"],
  multiplier: ["multiplier", "payout multiplier"],
  potentialPayout: ["potentialpayout", "towin", "to win", "payout"],
  actualPayout: ["actualpayout", "won amount", "amount won"],
  status: ["status", "result"],
  placedAt: ["placedat", "date", "date placed", "placed"],
  notes: ["notes", "note", "comment"],
  legDescription: ["description", "pick", "selectiondescription", "bet"],
  legPlayer: ["player"],
  legTeam: ["team"],
  legPropType: ["proptype", "prop", "market"],
  legSelection: ["selection", "overunder", "side"],
  legLine: ["line"],
  legOdds: ["legodds"],
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }))

  for (const field of CSV_TARGET_FIELDS) {
    const aliases = HEADER_ALIASES[field.key] ?? [field.key]
    const normalizedAliases = aliases.map(normalizeHeader)
    const match = normalizedHeaders.find((h) => normalizedAliases.includes(h.norm))
    mapping[field.key] = match?.raw ?? ""
  }

  return mapping
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const cleaned = raw.replace(/[$,%\s]/g, "")
  if (cleaned === "") return undefined
  const n = Number(cleaned)
  return Number.isNaN(n) ? undefined : n
}

function matchSportsbook(raw: string | undefined): (typeof sportsbookValues)[number] {
  const s = (raw ?? "").toLowerCase()
  if (s.includes("hard rock") || s.includes("hardrock")) return "HARDROCK"
  if (s.includes("dk") || s.includes("draftkings")) return "DK_PREDICTIONS"
  if (s.includes("prizepicks") || s.includes("prize picks")) return "PRIZEPICKS"
  return "OTHER"
}

function matchStatus(raw: string | undefined): (typeof betStatusValues)[number] {
  const s = (raw ?? "").toLowerCase()
  if (s.includes("win") || s === "won" || s === "w") return "WON"
  if (s.includes("los") || s === "lost" || s === "l") return "LOST"
  if (s.includes("push") || s.includes("tie")) return "PUSH"
  if (s.includes("cash")) return "CASHOUT"
  if (s.includes("void") || s.includes("cancel")) return "VOID"
  return "PENDING"
}

function matchLegStatus(raw: string | undefined): (typeof legStatusValues)[number] {
  const s = (raw ?? "").toLowerCase()
  if (s.includes("win") || s === "won" || s === "w") return "WON"
  if (s.includes("los") || s === "lost" || s === "l") return "LOST"
  if (s.includes("push") || s.includes("tie")) return "PUSH"
  if (s.includes("void") || s.includes("cancel")) return "VOID"
  return "PENDING"
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export type CsvRowResult = {
  rowIndex: number
  values: Partial<BetFormValues> | null
  errors: string[]
}

export function mapRowToBet(
  row: Record<string, string>,
  mapping: ColumnMapping,
  rowIndex: number
): CsvRowResult {
  const get = (field: string) => {
    const header = mapping[field]
    return header ? row[header]?.trim() : undefined
  }

  const errors: string[] = []

  const stake = parseNumber(get("stake"))
  if (stake === undefined || stake <= 0) errors.push("Missing or invalid stake")

  const potentialPayout = parseNumber(get("potentialPayout"))
  if (potentialPayout === undefined || potentialPayout <= 0) {
    errors.push("Missing or invalid potential payout")
  }

  const placedAt = parseDate(get("placedAt"))
  if (!placedAt) errors.push("Missing or invalid placed-at date")

  const legDescription = get("legDescription")
  if (!legDescription) errors.push("Missing leg description")

  if (errors.length > 0) {
    return { rowIndex, values: null, errors }
  }

  const values: Partial<BetFormValues> = {
    sportsbook: matchSportsbook(get("sportsbook")),
    sport: get("sport") ?? "",
    stake,
    oddsAmerican: parseNumber(get("oddsAmerican")) ?? null,
    multiplier: parseNumber(get("multiplier")) ?? null,
    potentialPayout,
    actualPayout: parseNumber(get("actualPayout")) ?? null,
    status: matchStatus(get("status")),
    placedAt: placedAt!,
    settledAt: "",
    notes: get("notes") ?? "",
    legs: [
      {
        description: legDescription!,
        player: get("legPlayer") ?? "",
        team: get("legTeam") ?? "",
        propType: get("legPropType") ?? "",
        selection: get("legSelection") ?? "",
        line: parseNumber(get("legLine")) ?? null,
        odds: parseNumber(get("legOdds")) ?? null,
        status: matchLegStatus(get("status")),
      },
    ],
  }

  return { rowIndex, values, errors: [] }
}
