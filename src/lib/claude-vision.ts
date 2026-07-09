import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import {
  betStatusValues,
  legStatusValues,
  sportsbookValues,
} from "@/lib/validations/bet"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_TOOL = {
  name: "record_bet_slip",
  description:
    "Record the structured details extracted from a sports bet slip screenshot.",
  input_schema: {
    type: "object" as const,
    properties: {
      sportsbook: {
        type: "string",
        enum: sportsbookValues,
        description:
          "Which app this screenshot is from. Use OTHER if it's not Hard Rock Bet, DK Predictions, or PrizePicks.",
      },
      sport: {
        type: "string",
        description: "League or sport, e.g. NBA, NFL, MLB. Omit if unclear.",
      },
      stake: {
        type: "number",
        description: "Amount wagered, in dollars.",
      },
      oddsAmerican: {
        type: "number",
        description:
          "Overall American odds for the bet (e.g. -110, +250), if shown. Omit for apps that use a payout multiplier instead (PrizePicks, DK Predictions).",
      },
      multiplier: {
        type: "number",
        description:
          "Payout multiplier if shown instead of odds, common on PrizePicks and DK Predictions (e.g. 3.0 for a 3x payout).",
      },
      potentialPayout: {
        type: "number",
        description: "Total potential/to-win payout in dollars, if shown.",
      },
      actualPayout: {
        type: "number",
        description:
          "Actual payout in dollars, only if the slip is already settled as won or cashed out.",
      },
      status: {
        type: "string",
        enum: betStatusValues,
        description:
          "Bet status. Use PENDING unless the screenshot clearly shows it as won, lost, pushed, cashed out, or voided.",
      },
      placedAt: {
        type: "string",
        description:
          "ISO 8601 date (YYYY-MM-DD) the bet was placed, if a date is visible. Omit otherwise.",
      },
      legs: {
        type: "array",
        minItems: 1,
        description:
          "Each individual pick on the slip. A straight bet has exactly one leg; a parlay or PrizePicks/DK Predictions pick has one per selection.",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "Human-readable summary of this pick, e.g. 'LeBron James Over 27.5 Points' or 'Lakers -4.5'.",
            },
            player: { type: "string", description: "Player name, if applicable." },
            team: { type: "string", description: "Team name, if applicable." },
            propType: {
              type: "string",
              description: "Type of prop, e.g. Points, Rebounds, Spread, Moneyline, Total.",
            },
            selection: {
              type: "string",
              description: "The selection made, e.g. 'Over', 'Under', 'Lakers -4.5'.",
            },
            line: { type: "number", description: "The line/number for this prop, if any." },
            odds: {
              type: "number",
              description: "American odds for this individual leg, if shown separately.",
            },
            status: {
              type: "string",
              enum: legStatusValues,
              description: "Leg status. Use PENDING unless clearly shown as settled.",
            },
          },
          required: ["description", "status"],
        },
      },
    },
    required: ["sportsbook", "stake", "status", "legs"],
  },
}

const extractedLegSchema = z.object({
  description: z.string(),
  player: z.string().optional(),
  team: z.string().optional(),
  propType: z.string().optional(),
  selection: z.string().optional(),
  line: z.number().optional(),
  odds: z.number().optional(),
  status: z.enum(legStatusValues).default("PENDING"),
})

const extractedBetSchema = z.object({
  sportsbook: z.enum(sportsbookValues),
  sport: z.string().optional(),
  stake: z.number(),
  oddsAmerican: z.number().optional(),
  multiplier: z.number().optional(),
  potentialPayout: z.number().optional(),
  actualPayout: z.number().optional(),
  status: z.enum(betStatusValues).default("PENDING"),
  placedAt: z.string().optional(),
  legs: z.array(extractedLegSchema).min(1),
})

export type ExtractedBet = z.infer<typeof extractedBetSchema>

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const

export function isSupportedImageType(mimeType: string): boolean {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mimeType)
}

export async function extractBetFromImage(
  base64: string,
  mediaType: string
): Promise<ExtractedBet> {
  if (!isSupportedImageType(mediaType)) {
    throw new Error(`Unsupported image type: ${mediaType}`)
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1500,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "record_bet_slip" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as (typeof SUPPORTED_MEDIA_TYPES)[number],
              data: base64,
            },
          },
          {
            type: "text",
            text: "This is a screenshot of a sports bet slip from Hard Rock Bet, DK Predictions, or PrizePicks. Extract its details using the record_bet_slip tool. Be as accurate as possible; if a field truly isn't visible, omit it rather than guessing.",
          },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )
  if (!toolUse) {
    throw new Error("The model did not return structured bet data for this image.")
  }

  return extractedBetSchema.parse(toolUse.input)
}
