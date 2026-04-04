"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Check, X, RotateCcw } from 'lucide-react'
import { recordReviewResult } from "@/lib/actions/practice"
import { Progress } from "@/components/ui/progress"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  explanation?: string | null
  example_sentence?: string | null
}

export default function FlashcardGame({ items }: { items: VocabularyItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const router = useRouter()

  const currentItem = items[currentIndex]
  const progress = (currentIndex / items.length) * 100

  const handleResult = async (success: boolean) => {
    // Optimistic progress
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
    } else {
      setSessionComplete(true)
    }

    // Background call to record result
    try {
      await recordReviewResult(currentItem.id, success)
    } catch (error) {
      console.error("Failed to record review:", error)
    }
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="p-4 rounded-full bg-green-100 text-green-600 mb-2">
          <Check className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold">Session Complete!</h2>
        <p className="text-muted-foreground max-w-sm">Great job! You've reviewed {items.length} items. Your progress has been updated.</p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Again
          </Button>
          <Button onClick={() => router.push('/dashboard/practice')}>
            Back to Practice
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{currentIndex + 1} / {items.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="relative h-96 perspective-1000">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full cursor-pointer"
              onClick={() => setIsFlipped(true)}
            >
              <Card className="w-full h-full flex items-center justify-center text-center p-8 bg-white border-2 hover:border-primary/50 transition-colors shadow-lg">
                <CardContent className="p-0">
                  <h2 className="text-4xl font-bold tracking-tight">{currentItem.word}</h2>
                  <p className="text-xs text-muted-foreground mt-8 animate-pulse">Click to flip</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full cursor-pointer"
            >
              <Card className="w-full h-full flex flex-col items-center justify-center text-center p-8 border-2 border-primary/50 bg-primary/5 shadow-xl">
                <CardContent className="p-0 space-y-4">
                  <h2 className="text-4xl font-bold text-primary">{currentItem.translation}</h2>
                  {currentItem.example_sentence && (
                     <p className="text-lg italic text-muted-foreground mt-4">"{currentItem.example_sentence}"</p>
                  )}
                  {currentItem.explanation && (
                    <p className="text-sm bg-background/80 p-2 rounded-md border text-muted-foreground mt-4">{currentItem.explanation}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-6">
        {isFlipped ? (
          <>
            <Button size="lg" variant="outline" className="h-16 w-32 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-all text-red-600" onClick={() => handleResult(false)}>
              <X className="w-6 h-6 mr-2" />
              Not sure
            </Button>
            <Button size="lg" className="h-16 w-32 bg-green-600 hover:bg-green-700 transition-all" onClick={() => handleResult(true)}>
              <Check className="w-6 h-6 mr-2" />
              Got it
            </Button>
          </>
        ) : (
          <Button size="lg" variant="outline" className="h-16 px-12" onClick={() => setIsFlipped(true)}>
            Flip Card
          </Button>
        )}
      </div>
    </div>
  )
}
