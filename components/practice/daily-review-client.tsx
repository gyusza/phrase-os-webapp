"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  RotateCcw,
  Volume2,
  Trophy,
  ArrowRight,
  Zap,
  CheckCircle2,
  Check,
  X,
  ListChecks,
  Keyboard,
  Headphones,
  Brain,
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { recordSRSReviewResult } from "@/lib/actions/practice"
import { generateDistractors, shuffle, fuzzyMatch } from "@/lib/quiz-utils"
import type { SRSRating, SRSLevel } from "@/lib/srs"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  context: string | null
  example_sentence: string | null
  srs_level: string
  ease_factor: string
  interval: number
  repetition_count: number
}

type QuestionMode = 'flashcard' | 'multiple-choice' | 'typing' | 'audio'

const MODE_ICONS: Record<QuestionMode, React.ReactNode> = {
  'flashcard': <Brain className="h-3.5 w-3.5" />,
  'multiple-choice': <ListChecks className="h-3.5 w-3.5" />,
  'typing': <Keyboard className="h-3.5 w-3.5" />,
  'audio': <Headphones className="h-3.5 w-3.5" />,
}

const MODE_LABELS: Record<QuestionMode, string> = {
  'flashcard': 'Flashcard',
  'multiple-choice': 'Multiple Choice',
  'typing': 'Type It',
  'audio': 'Audio',
}

/**
 * Adaptive question type based on SRS level
 * new → flashcard (just learn it)
 * learning → multiple choice (recognition)
 * young → typing (production)
 * mature → audio (listening)
 */
function getQuestionMode(srsLevel: string): QuestionMode {
  switch (srsLevel) {
    case 'new': return 'flashcard'
    case 'learning': return 'multiple-choice'
    case 'young': return 'typing'
    case 'mature': return 'audio'
    default: return 'flashcard'
  }
}

const RATING_CONFIG: { rating: SRSRating; label: string; color: string; hoverColor: string; description: string }[] = [
  { rating: 0, label: 'Again', color: 'text-red-600 border-red-200', hoverColor: 'hover:bg-red-50 hover:border-red-400', description: 'Forgot it' },
  { rating: 1, label: 'Hard', color: 'text-orange-600 border-orange-200', hoverColor: 'hover:bg-orange-50 hover:border-orange-400', description: 'Struggled' },
  { rating: 2, label: 'Good', color: 'text-emerald-600 border-emerald-200', hoverColor: 'hover:bg-emerald-50 hover:border-emerald-400', description: 'Recalled it' },
  { rating: 3, label: 'Easy', color: 'text-blue-600 border-blue-200', hoverColor: 'hover:bg-blue-50 hover:border-blue-400', description: 'Instant' },
]

export default function DailyReviewClient({ initialItems, totalDue }: { initialItems: VocabularyItem[]; totalDue: number }) {
  const [items] = useState<VocabularyItem[]>(initialItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Flashcard state
  const [isFlipped, setIsFlipped] = useState(false)

  // Multiple choice state
  const [mcOptions, setMcOptions] = useState<string[]>([])
  const [mcCorrectIndex, setMcCorrectIndex] = useState(0)
  const [mcSelected, setMcSelected] = useState<number | null>(null)
  const [mcAnswerState, setMcAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  // Typing state
  const [typedAnswer, setTypedAnswer] = useState("")
  const [typingState, setTypingState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  // Audio state
  const [audioOptions, setAudioOptions] = useState<string[]>([])
  const [audioCorrectIndex, setAudioCorrectIndex] = useState(0)
  const [audioSelected, setAudioSelected] = useState<number | null>(null)
  const [audioAnswerState, setAudioAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')

  // Current question mode
  const currentItem = items[currentIndex]
  const currentMode = currentItem ? getQuestionMode(currentItem.srs_level) : 'flashcard'

  // Setup question when index changes
  useEffect(() => {
    if (!currentItem) return

    const mode = getQuestionMode(currentItem.srs_level)

    // Reset all states
    setIsFlipped(false)
    setMcSelected(null)
    setMcAnswerState('idle')
    setTypedAnswer("")
    setTypingState('idle')
    setAudioSelected(null)
    setAudioAnswerState('idle')

    if (mode === 'multiple-choice') {
      const distractors = generateDistractors(currentItem, items, 3)
      const options = shuffle([
        currentItem.translation,
        ...distractors.map(d => d.translation),
      ])
      setMcOptions(options)
      setMcCorrectIndex(options.indexOf(currentItem.translation))
    }

    if (mode === 'audio') {
      const distractors = generateDistractors(currentItem, items, 3)
      const options = shuffle([
        currentItem.word,
        ...distractors.map(d => d.word),
      ])
      setAudioOptions(options)
      setAudioCorrectIndex(options.indexOf(currentItem.word))
    }

    if (mode === 'typing') {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [currentIndex, items])

  // Auto-play audio for audio mode
  useEffect(() => {
    if (currentMode === 'audio' && audioAnswerState === 'idle' && currentItem) {
      const timer = setTimeout(() => {
        playAudio(currentItem.translation, currentItem.target_language, true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentMode, audioAnswerState])

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
        console.error('TTS failed:', error)
      }
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleSRSRating = async (rating: SRSRating) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: rating >= 2 ? prev.correct + 1 : prev.correct,
    }))

    recordSRSReviewResult(currentItem.id, rating).catch(console.error)

    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setIsFinished(true)
    }

    setIsSubmitting(false)
  }

  const handleQuizAnswer = (isCorrect: boolean) => {
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
    }))

    // Map quiz result to SRS rating
    const rating: SRSRating = isCorrect ? 2 : 0
    recordSRSReviewResult(currentItem.id, rating).catch(console.error)
  }

  const advanceToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setIsFinished(true)
    }
  }

  // MC handlers
  const handleMCSelect = (idx: number) => {
    if (mcAnswerState !== 'idle') return
    setMcSelected(idx)
    const isCorrect = idx === mcCorrectIndex
    setMcAnswerState(isCorrect ? 'correct' : 'wrong')
    handleQuizAnswer(isCorrect)
  }

  // Typing handlers
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (typingState !== 'idle' || !typedAnswer.trim()) return

    const result = fuzzyMatch(typedAnswer, currentItem.translation)
    setTypingState(result.isMatch ? 'correct' : 'wrong')
    handleQuizAnswer(result.isMatch)
  }

  // Audio handlers
  const handleAudioSelect = (idx: number) => {
    if (audioAnswerState !== 'idle') return
    setAudioSelected(idx)
    const isCorrect = idx === audioCorrectIndex
    setAudioAnswerState(isCorrect ? 'correct' : 'wrong')
    handleQuizAnswer(isCorrect)
  }

  const getFlagCode = (lang: string) => {
    const mapping: Record<string, string> = { en: 'gb', da: 'dk', hu: 'hu', de: 'de' }
    return mapping[lang] || 'gb'
  }

  // Empty state
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-emerald-50/50 rounded-3xl border-2 border-emerald-200/50 shadow-xl"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold mb-2">All caught up! 🎉</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-sm">
          No words due for review right now. Great job staying on top of your learning.
        </p>
        <Button asChild className="rounded-2xl h-12 px-8 font-bold">
          <Link href="/dashboard/practice">Back to Practice</Link>
        </Button>
      </motion.div>
    )
  }

  // Session complete
  if (isFinished) {
    const retentionRate = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-primary/5 rounded-3xl border-2 border-primary/20 shadow-xl"
      >
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Review Complete!</h2>
        <p className="text-muted-foreground mb-6 text-lg">
          You reviewed {sessionStats.reviewed} words this session.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-white/80 rounded-2xl p-4 border shadow-sm">
            <div className="text-3xl font-black text-emerald-600">{retentionRate}%</div>
            <div className="text-xs font-bold text-muted-foreground mt-1">Retention</div>
          </div>
          <div className="bg-white/80 rounded-2xl p-4 border shadow-sm">
            <div className="text-3xl font-black text-primary">{sessionStats.correct}/{sessionStats.reviewed}</div>
            <div className="text-xs font-bold text-muted-foreground mt-1">Correct</div>
          </div>
        </div>

        {totalDue - sessionStats.reviewed > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {totalDue - sessionStats.reviewed} more words still due today.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Button variant="outline" className="flex-1 h-12 text-lg rounded-2xl" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-5 w-5" />
            Continue
          </Button>
          <Button className="flex-1 h-12 text-lg rounded-2xl" asChild>
            <Link href="/dashboard/practice" className="text-white">
              <ArrowRight className="mr-2 h-5 w-5" />
              Done
            </Link>
          </Button>
        </div>
      </motion.div>
    )
  }

  // Active review session
  const progressValue = ((currentIndex + 1) / items.length) * 100

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4 px-1 sm:px-0">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-primary flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Card {currentIndex + 1} of {items.length}
          </span>
          <Badge variant="secondary" className="gap-1 text-[10px] font-bold capitalize">
            {MODE_ICONS[currentMode]}
            {MODE_LABELS[currentMode]}
          </Badge>
        </div>
        <Progress value={progressValue} className="h-2.5" />
      </div>

      {/* ─── FLASHCARD MODE (new words) ─── */}
      {currentMode === 'flashcard' && (
        <>
          <div className="relative h-[350px] sm:h-[320px] w-full perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full h-full"
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  className="w-full h-full relative preserve-3d cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front — target language */}
                  <Card className="absolute inset-0 w-full h-full backface-hidden shadow-2xl border-2 hover:border-primary/50 transition-colors bg-white">
                    <CardContent className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
                      <Badge variant="outline" className="flex items-center gap-2 px-2 py-0.5 bg-muted/50 text-[10px]">
                        <Image src={`https://flagcdn.com/16x12/${getFlagCode(currentItem.target_language)}.png`} alt="" width={16} height={12} />
                        Target
                      </Badge>
                      <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{currentItem.translation}</h3>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); playAudio(currentItem.translation, currentItem.target_language, true) }}>
                        <Volume2 className="h-5 w-5 text-primary" />
                      </Button>
                      <p className="text-muted-foreground animate-pulse text-sm font-medium pt-4">Tap to reveal</p>
                    </CardContent>
                  </Card>

                  {/* Back — source language */}
                  <Card className="absolute inset-0 w-full h-full backface-hidden shadow-2xl border-2 border-primary/30 bg-primary/5"
                    style={{ transform: 'rotateY(180deg)' }}>
                    <CardContent className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-4">
                      <Badge className="bg-primary text-white flex items-center gap-2 px-2 py-0.5 text-[10px]">
                        <Image src={`https://flagcdn.com/16x12/${getFlagCode(currentItem.language)}.png`} alt="" width={16} height={12} className="border border-white/20" />
                        Meaning
                      </Badge>
                      <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-primary">{currentItem.word}</h3>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-primary/20"
                        onClick={(e) => { e.stopPropagation(); playAudio(currentItem.word, currentItem.language, false) }}>
                        <Volume2 className="h-5 w-5 text-primary" />
                      </Button>
                      {currentItem.example_sentence && (
                        <div className="bg-white/60 p-3 rounded-xl border border-primary/10 w-full max-w-md">
                          <p className="text-xs sm:text-sm italic text-muted-foreground">"{currentItem.example_sentence}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SRS Rating Buttons */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-3">
                <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">How well did you know it?</p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {RATING_CONFIG.map(({ rating, label, color, hoverColor, description }) => (
                    <Button key={rating} variant="outline"
                      className={`h-16 sm:h-20 flex flex-col gap-1 rounded-2xl border-2 transition-all ${color} ${hoverColor}`}
                      onClick={() => handleSRSRating(rating)} disabled={isSubmitting}>
                      <span className="text-sm sm:text-base font-black">{label}</span>
                      <span className="text-[9px] sm:text-[10px] opacity-60 font-medium">{description}</span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isFlipped && (
            <div className="flex justify-center">
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-2xl border-2 text-base font-bold" onClick={() => setIsFlipped(true)}>
                Reveal Answer
              </Button>
            </div>
          )}
        </>
      )}

      {/* ─── MULTIPLE CHOICE MODE (learning words) ─── */}
      {currentMode === 'multiple-choice' && (
        <AnimatePresence mode="wait">
          <motion.div key={currentItem.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card className="shadow-2xl border-2 bg-white overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">What does this mean?</p>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{currentItem.word}</h2>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
                    onClick={() => playAudio(currentItem.word, currentItem.language, false)}>
                    <Volume2 className="h-4 w-4 text-primary" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mcOptions.map((option, idx) => {
                    const isSelected = mcSelected === idx
                    const isCorrect = idx === mcCorrectIndex
                    let cn = "h-auto min-h-[3.5rem] py-3 px-4 text-left rounded-2xl border-2 transition-all font-semibold text-sm sm:text-base"
                    if (mcAnswerState !== 'idle') {
                      if (isCorrect) cn += " bg-emerald-50 border-emerald-400 text-emerald-700"
                      else if (isSelected) cn += " bg-red-50 border-red-400 text-red-700"
                      else cn += " opacity-50"
                    } else cn += " hover:border-primary/50 hover:bg-primary/5"

                    return (
                      <Button key={idx} variant="outline" className={cn} onClick={() => handleMCSelect(idx)} disabled={mcAnswerState !== 'idle'}>
                        <span className="flex items-center gap-2 w-full">
                          {mcAnswerState !== 'idle' && isCorrect && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          {mcAnswerState !== 'idle' && isSelected && !isCorrect && <X className="h-4 w-4 text-red-600 shrink-0" />}
                          <span className="break-words">{option}</span>
                        </span>
                      </Button>
                    )
                  })}
                </div>

                {mcAnswerState !== 'idle' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm ${
                      mcAnswerState === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {mcAnswerState === 'correct' ? <><Check className="h-4 w-4" /> Correct!</> : <><X className="h-4 w-4" /> Not quite</>}
                    </div>
                    <Button className="w-full h-12 rounded-xl font-bold" onClick={advanceToNext}>
                      {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ─── TYPING MODE (young words) ─── */}
      {currentMode === 'typing' && (
        <AnimatePresence mode="wait">
          <motion.div key={currentItem.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card className="shadow-2xl border-2 bg-white overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Type the translation</p>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{currentItem.word}</h2>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
                    onClick={() => playAudio(currentItem.word, currentItem.language, false)}>
                    <Volume2 className="h-4 w-4 text-primary" />
                  </Button>
                </div>

                <form onSubmit={handleTypingSubmit} className="space-y-4">
                  <Input ref={inputRef} value={typedAnswer} onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type the translation..." autoComplete="off" autoCorrect="off" spellCheck={false}
                    className={`h-14 text-lg font-semibold rounded-xl border-2 ${
                      typingState === 'correct' ? 'border-emerald-400 bg-emerald-50' :
                      typingState === 'wrong' ? 'border-red-400 bg-red-50' : 'focus:border-primary'
                    }`} disabled={typingState !== 'idle'} />

                  {typingState === 'idle' && (
                    <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={!typedAnswer.trim()}>Check</Button>
                  )}

                  {typingState === 'wrong' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-red-700 mb-1">Correct answer:</p>
                      <p className="text-lg font-extrabold text-red-900">{currentItem.translation}</p>
                    </div>
                  )}
                </form>

                {typingState !== 'idle' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm ${
                      typingState === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {typingState === 'correct' ? <><Check className="h-4 w-4" /> Correct!</> : <><X className="h-4 w-4" /> Not quite</>}
                    </div>
                    <Button className="w-full h-12 rounded-xl font-bold" onClick={advanceToNext}>
                      {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ─── AUDIO MODE (mature words) ─── */}
      {currentMode === 'audio' && (
        <AnimatePresence mode="wait">
          <motion.div key={currentItem.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card className="shadow-2xl border-2 bg-white overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Listen and identify</p>
                  <Button variant="outline" size="lg" className="h-20 w-20 rounded-full border-2 border-primary/30 hover:border-primary"
                    onClick={() => playAudio(currentItem.translation, currentItem.target_language, true)}>
                    <Volume2 className="h-8 w-8 text-primary" />
                  </Button>
                  <p className="text-xs text-muted-foreground">Tap to replay</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {audioOptions.map((option, idx) => {
                    const isSelected = audioSelected === idx
                    const isCorrect = idx === audioCorrectIndex
                    let cn = "h-auto min-h-[3.5rem] py-3 px-4 text-left rounded-2xl border-2 transition-all font-semibold text-sm sm:text-base"
                    if (audioAnswerState !== 'idle') {
                      if (isCorrect) cn += " bg-emerald-50 border-emerald-400 text-emerald-700"
                      else if (isSelected) cn += " bg-red-50 border-red-400 text-red-700"
                      else cn += " opacity-50"
                    } else cn += " hover:border-primary/50 hover:bg-primary/5"

                    return (
                      <Button key={idx} variant="outline" className={cn} onClick={() => handleAudioSelect(idx)} disabled={audioAnswerState !== 'idle'}>
                        <span className="flex items-center gap-2 w-full">
                          {audioAnswerState !== 'idle' && isCorrect && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          {audioAnswerState !== 'idle' && isSelected && !isCorrect && <X className="h-4 w-4 text-red-600 shrink-0" />}
                          <span className="break-words">{option}</span>
                        </span>
                      </Button>
                    )
                  })}
                </div>

                {audioAnswerState !== 'idle' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm ${
                      audioAnswerState === 'correct' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {audioAnswerState === 'correct' ? <><Check className="h-4 w-4" /> Correct!</> : <><X className="h-4 w-4" /> Not quite</>}
                    </div>
                    <Button className="w-full h-12 rounded-xl font-bold" onClick={advanceToNext}>
                      {currentIndex === items.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  )
}
