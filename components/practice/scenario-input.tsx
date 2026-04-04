"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { createScenario } from "@/lib/actions/scenarios"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"

export default function ScenarioInput() {
  const [scenarioPrompt, setScenarioPrompt] = useState("")
  const [targetLanguage, setTargetLanguage] = useState("da")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!scenarioPrompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      // 1. Create the Scenario record
      const scenario = await createScenario({
        title: scenarioPrompt.slice(0, 50) + (scenarioPrompt.length > 50 ? "..." : ""),
        user_id: "", // Will be filled by server action
        audio_url: `ai://${scenarioPrompt}`,
        duration: 0,
        transcription: scenarioPrompt, // Store prompt as transcription
        language: 'en',
        target_language: targetLanguage,
        status: 'analyzing'
      })

      if (!scenario?.id) throw new Error("Failed to create scenario")

      // 2. Trigger analysis with specialized prompt
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            scenarioId: scenario.id,
            isAIScenario: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate vocabulary')
      }

      toast({
        title: "Success!",
        description: `Your scenario "${scenario.title}" and its vocabulary have been generated.`,
      })
      
      setIsOpen(false)
      setScenarioPrompt("")
      router.push(`/dashboard/scenarios/${scenario.id}/analyze`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate scenario",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-fit gap-2 h-11 px-8 text-lg bg-primary hover:bg-primary/90 text-white shadow-lg">
          <Sparkles className="w-5 h-5" />
          Create New AI Scenario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Scenario Builder
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Describe a situation you want to practice for (e.g., ordering coffee, business meeting) and we'll generate the most relevant vocabulary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="scenario-prompt" className="text-sm font-semibold">What's the situation?</Label>
            <Input
              id="scenario-prompt"
              placeholder="e.g., Ordering a coffee at a busy cafe in Copenhagen"
              value={scenarioPrompt}
              onChange={(e) => setScenarioPrompt(e.target.value)}
              disabled={isGenerating}
              className="h-12 text-base border-primary/20 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="target-lang" className="text-sm font-semibold">Practice Language</Label>
            <select
                id="target-lang"
                className="flex h-12 w-full rounded-md border border-primary/20 bg-background px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={isGenerating}
            >
                <option value="da">Danish (Dansk)</option>
                <option value="en">English</option>
                <option value="hu">Hungarian (Magyar)</option>
                <option value="de">German (Deutsch)</option>
            </select>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-3 border border-destructive/20">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !scenarioPrompt.trim()}
            className="px-8 bg-primary hover:bg-primary/90 text-white min-w-[160px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building...
              </>
            ) : (
              "Start Practicing"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
