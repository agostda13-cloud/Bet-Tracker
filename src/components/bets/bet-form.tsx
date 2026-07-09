"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, TrashIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  betFormSchema,
  betStatusValues,
  legStatusValues,
  sportsbookValues,
  type BetFormInput,
  type BetFormValues,
} from "@/lib/validations/bet"
import { betStatusLabels, sportsbookLabels, legStatusLabels } from "@/lib/bet-labels"
import { createBet, updateBet } from "@/lib/actions/bets"

function toDatetimeLocal(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

const emptyLeg = {
  description: "",
  player: "",
  team: "",
  propType: "",
  line: null,
  selection: "",
  odds: null,
  status: "PENDING" as const,
}

type BetFormProps = {
  mode: "create" | "edit"
  betId?: string
  defaultValues?: Partial<BetFormValues>
}

export function BetForm({ mode, betId, defaultValues }: BetFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BetFormInput, unknown, BetFormValues>({
    resolver: zodResolver(betFormSchema),
    defaultValues: {
      sportsbook: defaultValues?.sportsbook ?? "HARDROCK",
      stake: defaultValues?.stake ?? undefined,
      oddsAmerican: defaultValues?.oddsAmerican ?? null,
      multiplier: defaultValues?.multiplier ?? null,
      potentialPayout: defaultValues?.potentialPayout ?? undefined,
      actualPayout: defaultValues?.actualPayout ?? null,
      status: defaultValues?.status ?? "PENDING",
      placedAt: toDatetimeLocal(defaultValues?.placedAt) || toDatetimeLocal(new Date().toISOString()),
      settledAt: toDatetimeLocal(defaultValues?.settledAt),
      sport: defaultValues?.sport ?? "",
      notes: defaultValues?.notes ?? "",
      legs: defaultValues?.legs?.length ? defaultValues.legs : [emptyLeg],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "legs" })
  const status = watch("status")

  const onSubmit = async (values: BetFormValues) => {
    setServerError(null)
    setIsSubmitting(true)
    const result =
      mode === "create"
        ? await createBet(values)
        : await updateBet(betId!, values)
    setIsSubmitting(false)

    if ("error" in result) {
      setServerError(result.error)
      return
    }
    router.push(`/bets/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bet details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sportsbook">Sportsbook</Label>
            <Controller
              control={control}
              name="sportsbook"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={sportsbookLabels}
                >
                  <SelectTrigger id="sportsbook" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sportsbookValues.map((sb) => (
                      <SelectItem key={sb} value={sb}>
                        {sportsbookLabels[sb]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sport">Sport / League</Label>
            <Input id="sport" placeholder="NBA, NFL, MLB..." {...register("sport")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stake">Stake ($)</Label>
            <Input id="stake" type="number" step="0.01" {...register("stake")} />
            {errors.stake && (
              <p className="text-destructive text-sm">{errors.stake.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="potentialPayout">Potential payout ($)</Label>
            <Input
              id="potentialPayout"
              type="number"
              step="0.01"
              {...register("potentialPayout")}
            />
            {errors.potentialPayout && (
              <p className="text-destructive text-sm">
                {errors.potentialPayout.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="oddsAmerican">Odds (American, optional)</Label>
            <Input
              id="oddsAmerican"
              type="number"
              placeholder="-110"
              {...register("oddsAmerican")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="multiplier">Multiplier (optional)</Label>
            <Input
              id="multiplier"
              type="number"
              step="0.01"
              placeholder="3.0"
              {...register("multiplier")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={betStatusLabels}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {betStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {betStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {status !== "PENDING" && (
            <div className="grid gap-2">
              <Label htmlFor="actualPayout">Actual payout ($)</Label>
              <Input
                id="actualPayout"
                type="number"
                step="0.01"
                {...register("actualPayout")}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="placedAt">Placed at</Label>
            <Input id="placedAt" type="datetime-local" {...register("placedAt")} />
            {errors.placedAt && (
              <p className="text-destructive text-sm">{errors.placedAt.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="settledAt">Settled at (optional)</Label>
            <Input id="settledAt" type="datetime-local" {...register("settledAt")} />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Legs</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyLeg)}
          >
            <PlusIcon /> Add leg
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errors.legs?.message && (
            <p className="text-destructive text-sm">{errors.legs.message}</p>
          )}
          {fields.map((field, index) => (
            <div key={field.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="grid gap-2 sm:col-span-3">
                  <Label>Description</Label>
                  <Input
                    placeholder="LeBron James Over 27.5 Points"
                    {...register(`legs.${index}.description`)}
                  />
                  {errors.legs?.[index]?.description && (
                    <p className="text-destructive text-sm">
                      {errors.legs[index]?.description?.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Selection</Label>
                  <Input placeholder="Over" {...register(`legs.${index}.selection`)} />
                </div>
                <div className="grid gap-2">
                  <Label>Odds</Label>
                  <Input type="number" {...register(`legs.${index}.odds`)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Player</Label>
                  <Input {...register(`legs.${index}.player`)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Team</Label>
                  <Input {...register(`legs.${index}.team`)} />
                </div>
                <div className="grid gap-2">
                  <Label>Line</Label>
                  <Input type="number" step="0.5" {...register(`legs.${index}.line`)} />
                </div>
                <div className="grid gap-2">
                  <Label>Leg status</Label>
                  <Controller
                    control={control}
                    name={`legs.${index}.status`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        items={legStatusLabels}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {legStatusValues.map((s) => (
                            <SelectItem key={s} value={s}>
                              {legStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex items-end sm:col-span-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    <TrashIcon /> Remove leg
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create bet" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
