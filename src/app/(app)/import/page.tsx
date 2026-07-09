"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScreenshotImportTab } from "@/components/import/screenshot-import-tab"
import { CsvImportTab } from "@/components/import/csv-import-tab"

export default function ImportPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Import bets</h1>

      <Tabs defaultValue="screenshot">
        <TabsList>
          <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="screenshot" className="mt-6">
          <ScreenshotImportTab />
        </TabsContent>
        <TabsContent value="csv" className="mt-6">
          <CsvImportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
