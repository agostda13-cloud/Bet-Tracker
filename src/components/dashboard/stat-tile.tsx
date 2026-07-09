import { cn } from "@/lib/utils"

export function StatTile({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string
  value: string
  tone?: "neutral" | "positive" | "negative"
  sub?: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </div>
  )
}
