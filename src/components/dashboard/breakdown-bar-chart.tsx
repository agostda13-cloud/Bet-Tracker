"use client"

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCurrency } from "@/lib/bet-labels"

type Row = { label: string; profit: number; count: number }

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: Row }[]
}) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{row.label}</p>
      <p className="tabular-nums">{formatCurrency(row.profit)}</p>
      <p className="text-muted-foreground text-xs">
        {row.count} bet{row.count === 1 ? "" : "s"}
      </p>
    </div>
  )
}

export function BreakdownBarChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        No settled bets yet.
      </div>
    )
  }

  const height = Math.max(48 * data.length, 80)

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "var(--foreground)", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <ReferenceLine x={0} stroke="var(--border)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="profit" radius={4} barSize={20}>
            {data.map((row) => (
              <Cell
                key={row.label}
                fill={row.profit >= 0 ? "var(--positive)" : "var(--negative)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
