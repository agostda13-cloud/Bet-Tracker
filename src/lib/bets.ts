import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { StatBet } from "@/lib/stats"

export type BetFilters = {
  sportsbook?: string
  status?: string
  sport?: string
  search?: string
  from?: string
  to?: string
}

export function buildBetWhere(
  userId: string,
  filters: BetFilters
): Prisma.BetWhereInput {
  const where: Prisma.BetWhereInput = { userId }

  if (filters.sportsbook) {
    where.sportsbook = filters.sportsbook as Prisma.BetWhereInput["sportsbook"]
  }
  if (filters.status) {
    where.status = filters.status as Prisma.BetWhereInput["status"]
  }
  if (filters.sport) {
    where.sport = { equals: filters.sport, mode: "insensitive" }
  }
  if (filters.search) {
    where.OR = [
      { sport: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
      {
        legs: {
          some: {
            description: { contains: filters.search, mode: "insensitive" },
          },
        },
      },
    ]
  }
  if (filters.from || filters.to) {
    where.placedAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    }
  }

  return where
}

export async function getBets(userId: string, filters: BetFilters = {}) {
  return prisma.bet.findMany({
    where: buildBetWhere(userId, filters),
    include: { legs: { orderBy: { sortOrder: "asc" } } },
    orderBy: { placedAt: "desc" },
  })
}

export async function getBetById(userId: string, id: string) {
  return prisma.bet.findFirst({
    where: { id, userId },
    include: { legs: { orderBy: { sortOrder: "asc" } } },
  })
}

export async function getStatBets(
  userId: string,
  filters: BetFilters = {}
): Promise<StatBet[]> {
  const bets = await prisma.bet.findMany({
    where: buildBetWhere(userId, filters),
    select: {
      id: true,
      stake: true,
      actualPayout: true,
      potentialPayout: true,
      status: true,
      sportsbook: true,
      sport: true,
      placedAt: true,
    },
    orderBy: { placedAt: "desc" },
  })

  return bets.map((bet) => ({
    id: bet.id,
    stake: Number(bet.stake),
    actualPayout: bet.actualPayout ? Number(bet.actualPayout) : null,
    potentialPayout: Number(bet.potentialPayout),
    status: bet.status,
    sportsbook: bet.sportsbook,
    sport: bet.sport,
    placedAt: bet.placedAt,
  }))
}

export async function getDistinctSports(userId: string) {
  const rows = await prisma.bet.findMany({
    where: { userId, sport: { not: null } },
    select: { sport: true },
    distinct: ["sport"],
  })
  return rows.map((r) => r.sport).filter((s): s is string => !!s)
}
