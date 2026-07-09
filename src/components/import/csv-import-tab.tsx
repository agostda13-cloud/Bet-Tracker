"use client"

import { useMemo, useRef, useState } from "react"
import Papa from "papaparse"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  CSV_TARGET_FIELDS,
  autoDetectMapping,
  mapRowToBet,
  type ColumnMapping,
} from "@/lib/csv-import"
import { commitImportedBets } from "@/lib/actions/import"
import { betFormSchema, type BetFormValues } from "@/lib/validations/bet"
import { formatCurrency, sportsbookLabels, betStatusLabels } from "@/lib/bet-labels"

const NONE = "__none__"

export function CsvImportTab() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [isCommitting, setIsCommitting] = useState(false)

  function handleFile(file: File | undefined) {
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const detectedHeaders = result.meta.fields ?? []
        setHeaders(detectedHeaders)
        setRows(result.data)
        setMapping(autoDetectMapping(detectedHeaders))
      },
    })
  }

  const mappedRows = useMemo(
    (): { rowIndex: number; values: BetFormValues | null; errors: string[] }[] =>
      rows.map((row, i) => {
        const result = mapRowToBet(row, mapping, i)
        if (!result.values) {
          return { rowIndex: i, values: null, errors: result.errors }
        }
        const validated = betFormSchema.safeParse(result.values)
        if (!validated.success) {
          return {
            rowIndex: i,
            values: null,
            errors: [validated.error.issues[0]?.message ?? "Invalid row"],
          }
        }
        return { rowIndex: i, values: validated.data, errors: [] }
      }),
    [rows, mapping]
  )

  const validRows = mappedRows.filter((r) => r.values)
  const invalidRows = mappedRows.filter((r) => !r.values)

  async function handleImport() {
    if (validRows.length === 0) return
    setIsCommitting(true)
    const result = await commitImportedBets(
      validRows.map((r) => ({ values: r.values! })),
      "CSV"
    )
    setIsCommitting(false)

    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success(`Imported ${result.count} bet${result.count === 1 ? "" : "s"}`)
    router.push("/bets")
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload a CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            Each row imports as one straight bet with a single leg. For parlays or
            multi-leg picks, use manual entry or screenshot import instead.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            id="csv-input"
          />
          <div>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon /> Choose CSV file
            </Button>
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Map columns</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CSV_TARGET_FIELDS.map((field) => (
                <div key={field.key} className="grid gap-1.5">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || NONE}
                    onValueChange={(v: string | null) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: v === NONE || !v ? "" : v,
                      }))
                    }
                    items={{
                      [NONE]: "-- none --",
                      ...Object.fromEntries(headers.map((h) => [h, h])),
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-- none --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                Preview — {validRows.length} ready, {invalidRows.length} need
                attention
              </CardTitle>
              <Button onClick={handleImport} disabled={validRows.length === 0 || isCommitting}>
                {isCommitting
                  ? "Importing..."
                  : `Import ${validRows.length} bet${validRows.length === 1 ? "" : "s"}`}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Sportsbook</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.map((r) => (
                    <TableRow key={r.rowIndex}>
                      <TableCell>{r.rowIndex + 1}</TableCell>
                      {r.values ? (
                        <>
                          <TableCell>{sportsbookLabels[r.values.sportsbook]}</TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {r.values.legs[0]?.description}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(r.values.stake)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(r.values.potentialPayout)}
                          </TableCell>
                          <TableCell>{betStatusLabels[r.values.status]}</TableCell>
                        </>
                      ) : (
                        <TableCell colSpan={5}>
                          <Badge variant="destructive">{r.errors.join(", ")}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
