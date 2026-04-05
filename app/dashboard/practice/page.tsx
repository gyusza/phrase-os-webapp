"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, Brain, Zap, Gamepad2 } from 'lucide-react'
import ScenarioSelectionDialog from "@/components/practice/scenario-selection-dialog"
import { useRouter } from "next/navigation"
import { getDueReviewCount } from "@/lib/actions/practice"

export default function PracticePage() {
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [practiceType, setPracticeType] = useState<"flashcards" | "listening">("flashcards")
  const [dueCount, setDueCount] = useState<number>(0)
  const router = useRouter()

  useEffect(() => {
    getDueReviewCount().then(setDueCount).catch(console.error)
  }, [])

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
        {/* Daily Review — Primary card */}
        <Card
          className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer md:col-span-2 ${
            dueCount > 0
              ? "border-2 border-primary/30 hover:border-primary/60 bg-primary/[0.02]"
              : "hover:border-primary/50"
          }`}
          onClick={() => router.push("/dashboard/practice/daily-review")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-32 h-32 rotate-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 w-fit rounded-xl mb-1 transition-all ${
                dueCount > 0
                  ? "bg-primary text-white"
                  : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
              }`}>
                <Zap className="w-6 h-6" />
              </div>
              {dueCount > 0 && (
                <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-sm px-3 py-1 animate-pulse">
                  {dueCount} words due
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl font-bold">Daily Review</CardTitle>
            <CardDescription>
              {dueCount > 0
                ? `You have ${dueCount} words ready for review. Spaced repetition helps you remember them long-term.`
                : "All caught up! Come back later for your next review session."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={dueCount > 0 ? "default" : "outline"}
              className="w-full font-semibold"
            >
              {dueCount > 0 ? "Start Review" : "All Caught Up ✓"}
            </Button>
          </CardContent>
        </Card>

        {/* Quiz Challenge */}
        <Card
          className="relative overflow-hidden group hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer"
          onClick={() => router.push("/dashboard/practice/quiz")}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Gamepad2 className="w-24 h-24 rotate-12" />
          </div>
          <CardHeader className="pb-4">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-all">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold">Quiz Challenge</CardTitle>
            <CardDescription>
              Test yourself with multiple choice, typing, and audio quizzes. Active recall at its best.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" className="w-full font-semibold">
              Start Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Flashcard Game */}
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

        {/* Passive Listening */}
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
