"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { extractBetFromImage, type ExtractedBet } from "@/lib/claude-vision"
import { betFormSchema, type BetFormValues } from "@/lib/validations/bet"

export type ParsedScreenshotResult =
  | { fileName: string; success: true; draft: Partial<BetFormValues>; raw: ExtractedBet }
  | { fileName: string; success: false; error: string }

function extractedBetToFormValues(bet: ExtractedBet): Partial<BetFormValues> {
  return {
    sportsbook: bet.sportsbook,
    sport: bet.sport ?? "",
    stake: bet.stake,
    oddsAmerican: bet.oddsAmerican ?? null,
    multiplier: bet.multiplier ?? null,
    potentialPayout: bet.potentialPayout ?? undefined,
    actualPayout: bet.actualPayout ?? null,
    status: bet.status,
    placedAt: bet.placedAt ?? new Date().toISOString(),
    settledAt: "",
    notes: "",
    legs: bet.legs.map((leg) => ({
      description: leg.description,
      player: leg.player ?? "",
      team: leg.team ?? "",
      propType: leg.propType ?? "",
      selection: leg.selection ?? "",
      line: leg.line ?? null,
      odds: leg.odds ?? null,
      status: leg.status,
    })),
  }
}

export async function parseScreenshots(
  formData: FormData
): Promise<ParsedScreenshotResult[]> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File)
  if (files.length === 0) return []

  return Promise.all(
    files.map(async (file): Promise<ParsedScreenshotResult> => {
      try {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const extracted = await extractBetFromImage(base64, file.type)
        return {
          fileName: file.name,
          success: true,
          draft: extractedBetToFormValues(extracted),
          raw: extracted,
        }
      } catch (error) {
        return {
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : "Failed to parse image",
        }
      }
    })
  )
}

export async function commitImportedBets(
  items: { values: BetFormValues; raw?: unknown }[]
): Promise<{ count: number } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" }

  const parsedItems = items.map((item) => betFormSchema.safeParse(item.values))
  const firstError = parsedItems.find((p) => !p.success)
  if (firstError && !firstError.success) {
    return { error: firstError.error.issues[0]?.message ?? "Invalid bet data" }
  }

  await prisma.$transaction(
    items.map((item, i) => {
      const data = parsedItems[i]
      if (!data.success) throw new Error("unreachable")
      const values = data.data
      return prisma.bet.create({
        data: {
          userId: session.user.id,
          sportsbook: values.sportsbook,
          stake: values.stake,
          oddsAmerican: values.oddsAmerican ?? null,
          multiplier: values.multiplier ?? null,
          potentialPayout: values.potentialPayout,
          actualPayout: values.actualPayout ?? null,
          status: values.status,
          placedAt: new Date(values.placedAt),
          settledAt: values.settledAt ? new Date(values.settledAt) : null,
          sport: values.sport || null,
          notes: values.notes || null,
          sourceType: "SCREENSHOT",
          rawImportData: item.raw ? JSON.parse(JSON.stringify(item.raw)) : undefined,
          legs: {
            create: values.legs.map((leg, index) => ({
              sortOrder: index,
              description: leg.description,
              player: leg.player || null,
              team: leg.team || null,
              propType: leg.propType || null,
              line: leg.line ?? null,
              selection: leg.selection || null,
              odds: leg.odds ?? null,
              status: leg.status,
            })),
          },
        },
      })
    })
  )

  revalidatePath("/bets")
  revalidatePath("/")
  return { count: items.length }
}
