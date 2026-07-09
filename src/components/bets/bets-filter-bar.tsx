"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { sportsbookValues, betStatusValues } from "@/lib/validations/bet"
import { sportsbookLabels, betStatusLabels } from "@/lib/bet-labels"

const ALL = "ALL"

const sportsbookItems = {
  [ALL]: "All sportsbooks",
  ...sportsbookLabels,
}
const statusItems = {
  [ALL]: "All statuses",
  ...betStatusLabels,
}

export function BetsFilterBar({ sports }: { sports: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") ?? "")

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === ALL) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("sportsbook") ?? ALL}
        onValueChange={(v) => setParam("sportsbook", v)}
        items={sportsbookItems}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sportsbook" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sportsbooks</SelectItem>
          {sportsbookValues.map((sb) => (
            <SelectItem key={sb} value={sb}>
              {sportsbookLabels[sb]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(v) => setParam("status", v)}
        items={statusItems}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {betStatusValues.map((s) => (
            <SelectItem key={s} value={s}>
              {betStatusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sports.length > 0 && (
        <Select
          value={searchParams.get("sport") ?? ALL}
          onValueChange={(v) => setParam("sport", v)}
          items={{ [ALL]: "All sports", ...Object.fromEntries(sports.map((s) => [s, s])) }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sports</SelectItem>
            {sports.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setParam("search", search)
        }}
      >
        <Input
          placeholder="Search legs, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[180px]"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {searchParams.toString() && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
