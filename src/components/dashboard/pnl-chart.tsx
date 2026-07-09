"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCurrency } from "@/lib/bet-labels"
import type { TimeSeriesPoint } from "@/lib/stats"

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs">
        {label ? new Date(label).toLocaleDateString() : ""}
      </p>
      <p className="font-medium tabular-nums">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function PnlChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No settled bets yet — cumulative profit will show up here.
      </div>
    )
  }

  const final = data[data.length - 1].cumulativeProfit
  const color = final >= 0 ? "var(--positive)" : "var(--negative)"

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativeProfit"
            stroke={color}
            strokeWidth={2}
            fill="url(#pnlFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
