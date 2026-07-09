"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { betFormSchema, type BetFormValues } from "@/lib/validations/bet"

function toDecimalOrNull(value: number | null | undefined) {
  return value === null || value === undefined ? null : value
}

function legsToPrismaCreate(values: BetFormValues) {
  return values.legs.map((leg, index) => ({
    sortOrder: index,
    description: leg.description,
    player: leg.player || null,
    team: leg.team || null,
    propType: leg.propType || null,
    line: toDecimalOrNull(leg.line),
    selection: leg.selection || null,
    odds: toDecimalOrNull(leg.odds),
    status: leg.status,
  }))
}

export async function createBet(
  values: BetFormValues
): Promise<{ id: string } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" }

  const parsed = betFormSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const bet = await prisma.bet.create({
    data: {
      userId: session.user.id,
      sportsbook: data.sportsbook,
      stake: data.stake,
      oddsAmerican: toDecimalOrNull(data.oddsAmerican),
      multiplier: toDecimalOrNull(data.multiplier),
      potentialPayout: data.potentialPayout,
      actualPayout: toDecimalOrNull(data.actualPayout),
      status: data.status,
      placedAt: new Date(data.placedAt),
      settledAt: data.settledAt ? new Date(data.settledAt) : null,
      sport: data.sport || null,
      notes: data.notes || null,
      sourceType: "MANUAL",
      legs: { create: legsToPrismaCreate(data) },
    },
  })

  revalidatePath("/bets")
  revalidatePath("/")
  return { id: bet.id }
}

export async function updateBet(
  id: string,
  values: BetFormValues
): Promise<{ id: string } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" }

  const existing = await prisma.bet.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Bet not found" }

  const parsed = betFormSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  await prisma.$transaction([
    prisma.betLeg.deleteMany({ where: { betId: id } }),
    prisma.bet.update({
      where: { id },
      data: {
        sportsbook: data.sportsbook,
        stake: data.stake,
        oddsAmerican: toDecimalOrNull(data.oddsAmerican),
        multiplier: toDecimalOrNull(data.multiplier),
        potentialPayout: data.potentialPayout,
        actualPayout: toDecimalOrNull(data.actualPayout),
        status: data.status,
        placedAt: new Date(data.placedAt),
        settledAt: data.settledAt ? new Date(data.settledAt) : null,
        sport: data.sport || null,
        notes: data.notes || null,
        legs: { create: legsToPrismaCreate(data) },
      },
    }),
  ])

  revalidatePath("/bets")
  revalidatePath(`/bets/${id}`)
  revalidatePath("/")
  return { id }
}

export async function deleteBet(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" }

  const existing = await prisma.bet.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Bet not found" }

  await prisma.bet.delete({ where: { id } })

  revalidatePath("/bets")
  revalidatePath("/")
  return { ok: true }
}
