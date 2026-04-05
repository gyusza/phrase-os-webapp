"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  Volume2, 
  Trophy,
  ArrowRight,
  Brain
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  context: string | null
  example_sentence: string | null
}

export default function FlashcardsClient({ initialVocabulary }: { initialVocabulary: VocabularyItem[] }) {
  const [items, setItems] = useState<VocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    // Shuffle and pick up to 10
    const shuffled = [...initialVocabulary]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
    setItems(shuffled)
  }, [initialVocabulary])

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setDirection(1)
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(prev => prev + 1), 50)
    } else {
      setIsFinished(true)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(prev => prev - 1), 50)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    if (!isFlipped) {
        // Just flipped to translation
    }
  }

  const playAudio = async (text: string, language: string, isTarget: boolean = true) => {
    if (isTarget) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language })
        })
        const data = await response.json()
        if (data.audio) {
          const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`)
          audio.play()
          return
        }
      } catch (error) {
        console.error('Gemini TTS failed, falling back to browser TTS:', error)
      }
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const getFlagCode = (lang: string) => {
    const mapping: any = { en: 'gb', da: 'dk', hu: 'hu', de: 'de' }
    return mapping[lang] || 'gb'
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-muted/20 rounded-xl border-2 border-dashed">
        <Brain className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">No vocabulary to practice</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          You need at least one vocabulary item to start the flashcard game.
        </p>
        <Button asChild>
          <Link href="/dashboard/scenarios/create">Create a Scenario</Link>
        </Button>
      </div>
    )
  }

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-primary/5 rounded-3xl border-2 border-primary/20 shadow-xl"
      >
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Session complete!</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          You've reviewed {items.length} words and expressions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Button variant="outline" className="flex-1 h-12 text-lg" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-5 w-5" />
            Repeat Session
          </Button>
          <Button className="flex-1 h-12 text-lg" asChild>
            <Link href="/dashboard/practice" className="text-white">
              <ArrowRight className="mr-2 h-5 w-5" />
              More Practice
            </Link>
          </Button>
        </div>
      </motion.div>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4 px-1 sm:px-0">
      <div className="space-y-2">
        <div className="flex justify-between items-end text-sm">
          <span className="font-semibold text-primary">Card {currentIndex + 1} of {items.length}</span>
          <span className="text-muted-foreground font-medium">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      <div className="relative h-[400px] sm:h-[350px] w-full perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ x: direction * 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full h-full"
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              className="w-full h-full relative preserve-3d cursor-pointer"
              onClick={handleFlip}
            >
              {/* Front Side */}
              <Card className="absolute inset-0 w-full h-full backface-hidden shadow-2xl border-2 hover:border-primary/50 transition-colors bg-white">
                <CardContent className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
                  <Badge variant="outline" className="flex items-center gap-2 px-2 py-0.5 sm:px-3 sm:py-1 bg-muted/50 text-[10px] sm:text-xs">
                    <Image 
                      src={`https://flagcdn.com/16x12/${getFlagCode(currentItem.language)}.png`}
                      alt="Language"
                      width={16}
                      height={12}
                    />
                    Original
                  </Badge>
                  <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground break-words leading-tight px-2">{currentItem.word}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-full hover:bg-primary/10" 
                    onClick={(e) => { e.stopPropagation(); playAudio(currentItem.word, currentItem.language, false) }}
                  >
                    <Volume2 className="h-5 w-5 text-primary" />
                  </Button>
                  <p className="text-muted-foreground animate-pulse text-sm font-medium pt-8">Click to reveal translation</p>
                </CardContent>
              </Card>

              {/* Back Side */}
              <Card 
                className="absolute inset-0 w-full h-full backface-hidden shadow-2xl border-2 border-primary/30 bg-card"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <CardContent className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
                  <Badge className="flex items-center gap-2 px-2 py-0.5 sm:px-3 sm:py-1 bg-primary text-white text-[10px] sm:text-xs">
                    <Image 
                      src={`https://flagcdn.com/16x12/${getFlagCode(currentItem.target_language)}.png`}
                      alt="Language"
                      width={16}
                      height={12}
                      className="border border-white/20"
                    />
                    Translation
                  </Badge>
                  <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-primary break-words leading-tight px-2">{currentItem.translation}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-full hover:bg-primary/20" 
                    onClick={(e) => { e.stopPropagation(); playAudio(currentItem.translation, currentItem.target_language, true) }}
                  >
                    <Volume2 className="h-5 w-5 text-primary" />
                  </Button>
                  
                  {currentItem.example_sentence && (
                    <div className="bg-white/60 p-3 sm:p-4 rounded-xl border border-primary/10 w-full max-w-md mt-2 sm:mt-4">
                        <p className="text-xs sm:text-sm italic text-muted-foreground leading-relaxed">"{currentItem.example_sentence}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 sm:gap-4 pt-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="h-16 px-4 sm:px-8 rounded-2xl flex-1 border-2 text-base"
        >
          <ChevronLeft className="mr-1 sm:mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleNext}
          className="h-16 px-4 sm:px-8 rounded-2xl flex-1 border-2 border-primary text-white bg-primary hover:bg-primary/90 text-base"
        >
          {currentIndex === items.length - 1 ? "Finish" : "Next"}
          <ChevronRight className="ml-1 sm:ml-2 h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>

    </div>
  )
}
