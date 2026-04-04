"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getScenarios } from "@/lib/actions/scenarios"
import { Loader2, Calendar, FileText, CheckCircle2, Circle, BookPlus, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface ScenarioSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  practiceType: "flashcards" | "listening"
}

export default function ScenarioSelectionDialog({
  isOpen,
  onClose,
  practiceType,
}: ScenarioSelectionDialogProps) {
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      loadScenarios()
    }
  }, [isOpen])

  const loadScenarios = async () => {
    setLoading(true)
    try {
      const data = await getScenarios()
      setScenarios(data)
      // Default to "All" (Scenarios + Manual)
      setSelectedIds(new Set([...data.map((s: any) => s.id), 'manual']))
    } catch (error) {
      console.error("Failed to load scenarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    const allIds = [...scenarios.map((s) => s.id), 'manual']
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleScenario = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleStart = () => {
    const ids = Array.from(selectedIds).join(",")
    const path = practiceType === "flashcards" ? "/dashboard/practice/flashcards" : "/dashboard/practice/listening"
    
    // If all are selected, we can just send no params to signify "All" or send them all.
    // Let's send them explicitly if it's not all, otherwise no params.
    const allIds = [...scenarios.map(s => s.id), 'manual']
    if (selectedIds.size === allIds.length) {
      router.push(path)
    } else {
      router.push(`${path}?scenarios=${ids}`)
    }
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Select Scenarios</DialogTitle>
          <DialogDescription>
            Choose the scenarios you want to practice with today.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 bg-muted/30 border-y flex justify-between items-center text-sm">
          <span className="font-medium text-muted-foreground">
            {selectedIds.size} of {scenarios.length} selected
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSelectAll}
            className="h-8 hover:bg-background"
          >
            {selectedIds.size === scenarios.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <ScrollArea className="h-[350px] px-6">
          <div className="py-2 flex flex-col gap-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : (
              <>
                {/* Virtual Entry: Manual Phrases */}
                <div
                  onClick={() => toggleScenario('manual')}
                  className={`
                    flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border-2 mb-2
                    ${selectedIds.has('manual') 
                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                      : "hover:bg-muted/50 border-transparent"}
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors
                    ${selectedIds.has('manual') ? "bg-primary border-primary" : "bg-background border-input"}
                  `}>
                    {selectedIds.has('manual') && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <BookPlus className="h-4 w-4 text-primary" />
                        <p className="font-bold tracking-tight">Manual Expressions</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium opacity-70">
                      Phrases you added yourself without a scenario
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-3 px-1">
                    <div className="h-[1px] flex-1 bg-muted-foreground/10" />
                    <span className="text-[10px] font-bold text-muted-foreground/40">Your scenarios</span>
                    <div className="h-[1px] flex-1 bg-muted-foreground/10" />
                </div>

                {scenarios.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm italic">
                    No scenarios found.
                  </div>
                ) : (
                  scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      className={`
                        flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border-2
                        ${selectedIds.has(scenario.id) 
                          ? "bg-primary/5 border-primary/20" 
                          : "hover:bg-muted/50 border-transparent"}
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                        ${selectedIds.has(scenario.id) ? "bg-primary border-primary" : "bg-background border-input"}
                      `}>
                        {selectedIds.has(scenario.id) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{scenario.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(scenario.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {scenario.language}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 bg-muted/10">
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
                onClick={handleStart} 
                disabled={selectedIds.size === 0} 
                className="flex-1 font-semibold"
            >
              Start Practice
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
