"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UploadIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BetForm } from "@/components/bets/bet-form"
import {
  parseScreenshots,
  commitImportedBets,
  type ParsedScreenshotResult,
} from "@/lib/actions/import"
import type { BetFormValues } from "@/lib/validations/bet"
import type { ExtractedBet } from "@/lib/claude-vision"

type ReviewItem = {
  id: string
  fileName: string
  raw: ExtractedBet
  draft: Partial<BetFormValues>
  confirmed?: BetFormValues
}

type ErrorItem = { id: string; fileName: string; error: string }

export function ScreenshotImportTab() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, startParsing] = useTransition()
  const [isCommitting, setIsCommitting] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [errorItems, setErrorItems] = useState<ErrorItem[]>([])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const formData = new FormData()
    Array.from(files).forEach((file) => formData.append("images", file))

    startParsing(async () => {
      const results = await parseScreenshots(formData)
      const newReview: ReviewItem[] = []
      const newErrors: ErrorItem[] = []
      results.forEach((r: ParsedScreenshotResult, i: number) => {
        const id = `${Date.now()}-${i}`
        if (r.success) {
          newReview.push({ id, fileName: r.fileName, raw: r.raw, draft: r.draft })
        } else {
          newErrors.push({ id, fileName: r.fileName, error: r.error })
        }
      })
      setReviewItems((prev) => [...prev, ...newReview])
      setErrorItems((prev) => [...prev, ...newErrors])
      if (fileInputRef.current) fileInputRef.current.value = ""
    })
  }

  function confirmItem(id: string, values: BetFormValues) {
    setReviewItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, confirmed: values } : item))
    )
  }

  function discardItem(id: string) {
    setReviewItems((prev) => prev.filter((item) => item.id !== id))
  }

  const confirmedCount = reviewItems.filter((i) => i.confirmed).length
  const pendingReviewCount = reviewItems.length - confirmedCount

  async function handleImport() {
    const toImport = reviewItems.filter((i) => i.confirmed)
    if (toImport.length === 0) return
    setIsCommitting(true)
    const result = await commitImportedBets(
      toImport.map((i) => ({ values: i.confirmed!, raw: i.raw })),
      "SCREENSHOT"
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
          <CardTitle>Upload bet slip screenshots</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            Upload one or more screenshots from Hard Rock Bet, DK Predictions, or
            PrizePicks. Claude will read each slip and you can review and edit before
            importing.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id="screenshot-input"
          />
          <div>
            <Button
              type="button"
              disabled={isParsing}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon /> {isParsing ? "Parsing..." : "Choose screenshots"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorItems.length > 0 && (
        <div className="grid gap-2">
          {errorItems.map((item) => (
            <Alert key={item.id} variant="destructive">
              <XCircleIcon />
              <AlertTitle>Couldn&apos;t parse {item.fileName}</AlertTitle>
              <AlertDescription>{item.error}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="grid gap-6">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <p className="text-sm">
              {confirmedCount} of {reviewItems.length} ready to import
              {pendingReviewCount > 0
                ? ` — review the ${pendingReviewCount} remaining below`
                : ""}
            </p>
            <Button onClick={handleImport} disabled={confirmedCount === 0 || isCommitting}>
              {isCommitting ? "Importing..." : `Import ${confirmedCount} bet${confirmedCount === 1 ? "" : "s"}`}
            </Button>
          </div>

          {reviewItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{item.fileName}</CardTitle>
                {item.confirmed && (
                  <span className="flex items-center gap-1.5 text-sm text-positive">
                    <CheckCircle2Icon className="size-4" /> Ready
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {item.confirmed ? (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      Confirmed — {item.confirmed.legs.length} leg
                      {item.confirmed.legs.length === 1 ? "" : "s"}, $
                      {item.confirmed.stake} stake
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReviewItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, confirmed: undefined } : i
                          )
                        )
                      }
                    >
                      Edit again
                    </Button>
                  </div>
                ) : (
                  <BetForm
                    mode="review"
                    defaultValues={item.draft}
                    onConfirm={(values) => confirmItem(item.id, values)}
                    onDiscard={() => discardItem(item.id)}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
