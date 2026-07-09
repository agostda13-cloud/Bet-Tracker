import { z } from "zod"

export const sportsbookValues = [
  "HARDROCK",
  "DK_PREDICTIONS",
  "PRIZEPICKS",
  "OTHER",
] as const

export const betStatusValues = [
  "PENDING",
  "WON",
  "LOST",
  "PUSH",
  "CASHOUT",
  "VOID",
] as const

export const legStatusValues = [
  "PENDING",
  "WON",
  "LOST",
  "PUSH",
  "VOID",
] as const

export const betLegSchema = z.object({
  description: z.string().trim().min(1, "Required"),
  player: z.string().trim().optional().or(z.literal("")),
  team: z.string().trim().optional().or(z.literal("")),
  propType: z.string().trim().optional().or(z.literal("")),
  line: z.coerce.number().optional().nullable(),
  selection: z.string().trim().optional().or(z.literal("")),
  odds: z.coerce.number().int().optional().nullable(),
  status: z.enum(legStatusValues).default("PENDING"),
})

export const betFormSchema = z.object({
  sportsbook: z.enum(sportsbookValues),
  stake: z.coerce.number().positive("Stake must be greater than 0"),
  oddsAmerican: z.coerce.number().int().optional().nullable(),
  multiplier: z.coerce.number().positive().optional().nullable(),
  potentialPayout: z.coerce.number().positive("Required"),
  actualPayout: z.coerce.number().optional().nullable(),
  status: z.enum(betStatusValues).default("PENDING"),
  placedAt: z.string().min(1, "Required"),
  settledAt: z.string().optional().or(z.literal("")),
  sport: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  legs: z.array(betLegSchema).min(1, "Add at least one leg"),
})

export type BetFormValues = z.output<typeof betFormSchema>
export type BetFormInput = z.input<typeof betFormSchema>
export type BetLegFormValues = z.output<typeof betLegSchema>
