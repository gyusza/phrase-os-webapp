"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from 'lucide-react'
import { exportProgressAsCSV } from "@/lib/actions/practice"
import { useToast } from "@/hooks/use-toast"

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const csv = await exportProgressAsCSV()
      
      if (csv === "No data to export") {
        toast({
          title: "No Data",
          description: "There is no vocabulary to export yet.",
        })
        return
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `phrase-os-export-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Successful",
        description: "Your vocabulary progress has been exported to CSV.",
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting your data.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="gap-2" 
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="w-4 h-4" />
      {isExporting ? "Exporting..." : "Export Data"}
    </Button>
  )
}
