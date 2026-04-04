"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, Brain } from 'lucide-react'
import ScenarioSelectionDialog from "@/components/practice/scenario-selection-dialog"

export default function PracticePage() {
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [practiceType, setPracticeType] = useState<"flashcards" | "listening">("flashcards")

  const handleStartPractice = (type: "flashcards" | "listening") => {
    setPracticeType(type)
    setIsSelectionOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Practice</h1>
          <p className="text-muted-foreground">Master your vocabulary through interactive exercises.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card 
            className="relative overflow-hidden group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
            onClick={() => handleStartPractice("flashcards")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Brain className="w-24 h-24 rotate-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-all">
              <Brain className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Flashcard Game</CardTitle>
            <CardDescription>
              Interactive memory training. Flip, reveal, and master up to 10 expressions per session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" className="w-full font-semibold">
              Start Game
            </Button>
          </CardContent>
        </Card>

        <Card 
            className="relative overflow-hidden group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
            onClick={() => handleStartPractice("listening")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Mic className="w-24 h-24 -rotate-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-all">
              <Mic className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Passive Listening</CardTitle>
            <CardDescription>
              Audio-first immersion. Listen, repeat, and perfect your pronunciation hands-free.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" className="w-full font-semibold">
              Start Listening
            </Button>
          </CardContent>
        </Card>
      </div>

      <ScenarioSelectionDialog 
        isOpen={isSelectionOpen} 
        onClose={() => setIsSelectionOpen(false)} 
        practiceType={practiceType}
      />
    </div>
  )
}
