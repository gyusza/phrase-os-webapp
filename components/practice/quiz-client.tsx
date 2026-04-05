"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Trophy,
  ArrowRight,
  RotateCcw,
  Volume2,
  Check,
  X,
  Keyboard,
  ListChecks,
  Headphones,
  Shuffle,
  Gamepad2,
  Zap,
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { generateDistractors, shuffle, fuzzyMatch, diffHighlight } from "@/lib/quiz-utils"
import { recordReviewResult } from "@/lib/actions/practice"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  context: string | null
  example_sentence: string | null
  scenario_title?: string | null
}

type QuizType = 'multiple-choice' | 'typing' | 'audio' | 'mixed'
type QuestionType = 'multiple-choice' | 'typing' | 'audio'

interface Question {
  type: QuestionType
  item: VocabularyItem
  options?: string[] // for multiple-choice and audio
  correctIndex?: number
}

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  'multiple-choice': <ListChecks className="h-3.5 w-3.5" />,
  'typing': <Keyboard className="h-3.5 w-3.5" />,
  'audio': <Headphones className="h-3.5 w-3.5" />,
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple Choice',
  'typing': 'Type the Answer',
  'audio': 'Audio Quiz',
}

function buildQuestions(items: VocabularyItem[], quizType: QuizType, count: number = 10): Question[] {
  const shuffledItems = shuffle(items).slice(0, count)

  return shuffledItems.map((item) => {
    let type: QuestionType

    if (quizType === 'mixed') {
      const types: QuestionType[] = ['multiple-choice', 'typing', 'audio']
      type = types[Math.floor(Math.random() * types.length)]
    } else {
      type = quizType
    }

    if (type === 'multiple-choice' || type === 'audio') {
      const distractors = generateDistractors(item, items, 3)
      const options = shuffle([
        item.translation,
        ...distractors.map(d => d.translation),
      ])
      return {
        type,
        item,
        options,
        correctIndex: options.indexOf(item.translation),
      }
    }

    return { type, item }
  })
}

export default function QuizClient({ initialVocabulary, quizType }: { initialVocabulary: VocabularyItem[]; quizType: QuizType }) {
  const [questions] = useState<Question[]>(() => 
    initialVocabulary.length >= 2 ? buildQuestions(initialVocabulary, quizType) : []
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState("")
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)



  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

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
          audio.play().catch(e => {
            console.warn('Audio play blocked or failed:', e)
            // Silently fail or show a manual play indicator if needed
          })
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

  // Auto-play audio for audio quiz questions (only if started)
  useEffect(() => {
    if (isStarted && currentQuestion?.type === 'audio' && answerState === 'idle') {
      const timer = setTimeout(() => {
        playAudio(currentQuestion.item.translation, currentQuestion.item.target_language, true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isStarted, currentIndex, currentQuestion?.type, answerState])

  // Auto-focus typing input
  useEffect(() => {
    if (currentQuestion?.type === 'typing' && answerState === 'idle') {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [currentIndex, currentQuestion?.type, answerState])

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setAnswerState('correct')
      setScore(prev => prev + 1)
      setStreak(prev => {
        const newStreak = prev + 1
        if (newStreak > bestStreak) setBestStreak(newStreak)
        return newStreak
      })
    } else {
      setAnswerState('wrong')
      setStreak(0)
      setShowCorrectAnswer(true)
    }

    // Record result (fire and forget)
    recordReviewResult(currentQuestion.item.id, isCorrect).catch(console.error)
  }

  const handleMultipleChoiceSelect = (optionIndex: number) => {
    if (answerState !== 'idle') return
    setSelectedOption(optionIndex)
    handleAnswer(optionIndex === currentQuestion.correctIndex)
  }

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (answerState !== 'idle' || !typedAnswer.trim()) return

    const result = fuzzyMatch(typedAnswer, currentQuestion.item.translation)
    handleAnswer(result.isMatch)
  }

  const handleAudioSelect = (optionIndex: number) => {
    if (answerState !== 'idle') return
    setSelectedOption(optionIndex)
    handleAnswer(optionIndex === currentQuestion.correctIndex)
  }

  const advanceToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setAnswerState('idle')
      setSelectedOption(null)
      setTypedAnswer("")
      setShowCorrectAnswer(false)
    } else {
      setIsFinished(true)
    }
  }

  const startQuiz = () => {
    setIsStarted(true)
    // If first question is audio, trigger it directly on button click
    if (questions[0]?.type === 'audio') {
      playAudio(questions[0].item.translation, questions[0].item.target_language, true)
    }
  }

  const getFlagCode = (lang: string) => {
    const mapping: Record<string, string> = { en: 'gb', da: 'dk', hu: 'hu', de: 'de' }
    return mapping[lang] || 'gb'
  }

  // Not enough vocabulary
  if (initialVocabulary.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-muted/20 rounded-3xl border-2 border-dashed">
        <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Not enough vocabulary</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          You need at least 2 vocabulary items to start a quiz. Add more words from your scenarios.
        </p>
        <Button asChild>
          <Link href="/dashboard/scenarios/create">Create a Scenario</Link>
        </Button>
      </div>
    )
  }

  if (questions.length === 0) return null

  // Finished
  if (isFinished) {
    const accuracy = Math.round((score / questions.length) * 100)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-primary/5 rounded-3xl border-2 border-primary/20 shadow-xl"
      >
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-muted-foreground mb-6 text-lg">
          You scored {score} out of {questions.length}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
          <div className="bg-white/80 rounded-2xl p-4 border shadow-sm">
            <div className="text-3xl font-black text-emerald-600">{accuracy}%</div>
            <div className="text-xs font-bold text-muted-foreground mt-1">Accuracy</div>
          </div>
          <div className="bg-white/80 rounded-2xl p-4 border shadow-sm">
            <div className="text-3xl font-black text-primary">{score}/{questions.length}</div>
            <div className="text-xs font-bold text-muted-foreground mt-1">Correct</div>
          </div>
          <div className="bg-white/80 rounded-2xl p-4 border shadow-sm">
            <div className="text-3xl font-black text-orange-500">{bestStreak}</div>
            <div className="text-xs font-bold text-muted-foreground mt-1">Best Streak</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Button variant="outline" className="flex-1 h-12 text-lg rounded-2xl" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-5 w-5" />
            Play Again
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

  // Start Screen
  if (!isStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-3xl border-2 shadow-xl"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Zap className="h-10 w-10 text-primary animate-pulse" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Ready to Start?</h2>
        <p className="text-muted-foreground mb-8 text-lg max-w-sm">
          Challenge yourself with {questions.length} questions from your saved phrases.
          {quizType === 'audio' || quizType === 'mixed' ? ' Make sure your audio is on!' : ''}
        </p>

        <Button size="lg" className="h-14 px-10 text-lg rounded-2xl w-full max-w-xs shadow-lg hover:shadow-primary/20 transition-all" onClick={startQuiz}>
          Start Quiz
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    )
  }

  // Active Quiz
  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4 px-1 sm:px-0">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">Q{currentIndex + 1}/{questions.length}</span>
            <Badge variant="secondary" className="gap-1 text-[10px] font-bold">
              {QUESTION_TYPE_ICONS[currentQuestion.type]}
              {QUESTION_TYPE_LABELS[currentQuestion.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {streak > 1 && (
              <Badge className="bg-orange-500 text-white gap-1 animate-pulse">
                <Zap className="h-3 w-3" />
                {streak}x streak
              </Badge>
            )}
            <span className="font-bold text-emerald-600">{score} pts</span>
          </div>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="shadow-2xl border-2 bg-white overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Question Prompt */}
              <div className="text-center space-y-4">
                {currentQuestion.type === 'audio' ? (
                  <>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Listen and identify</p>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-20 w-20 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                      onClick={() => playAudio(currentQuestion.item.translation, currentQuestion.item.target_language, true)}
                    >
                      <Volume2 className="h-8 w-8 text-primary" />
                    </Button>
                    <p className="text-xs text-muted-foreground">Tap to replay</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      {currentQuestion.type === 'typing' ? 'Type the translation' : 'What does this mean?'}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/50 text-[10px]">
                        <Image
                          src={`https://flagcdn.com/16x12/${getFlagCode(currentQuestion.item.language)}.png`}
                          alt="Language"
                          width={16}
                          height={12}
                        />
                        Original
                      </Badge>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{currentQuestion.item.word}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
                      onClick={() => playAudio(currentQuestion.item.word, currentQuestion.item.language, false)}
                    >
                      <Volume2 className="h-4 w-4 text-primary" />
                    </Button>
                  </>
                )}
              </div>

              {/* Answer Area */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options!.map((option, idx) => {
                    const isSelected = selectedOption === idx
                    const isCorrect = idx === currentQuestion.correctIndex
                    let className = "h-auto min-h-[3.5rem] py-3 px-4 text-left rounded-2xl border-2 transition-all font-semibold text-sm sm:text-base"

                    if (answerState !== 'idle') {
                      if (isCorrect) {
                        className += " bg-emerald-50 border-emerald-400 text-emerald-700"
                      } else if (isSelected && !isCorrect) {
                        className += " bg-red-50 border-red-400 text-red-700"
                      } else {
                        className += " opacity-50"
                      }
                    } else {
                      className += " hover:border-primary/50 hover:bg-primary/5"
                    }

                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className={className}
                        onClick={() => handleMultipleChoiceSelect(idx)}
                        disabled={answerState !== 'idle'}
                      >
                        <span className="flex items-center gap-2 w-full">
                          {answerState !== 'idle' && isCorrect && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          {answerState !== 'idle' && isSelected && !isCorrect && <X className="h-4 w-4 text-red-600 shrink-0" />}
                          <span className="break-words">{option}</span>
                        </span>
                      </Button>
                    )
                  })}
                </div>
              )}

              {currentQuestion.type === 'typing' && (
                <form onSubmit={handleTypingSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white flex items-center gap-1.5 px-2 py-0.5 text-[10px]">
                      <Image
                        src={`https://flagcdn.com/16x12/${getFlagCode(currentQuestion.item.target_language)}.png`}
                        alt="Language"
                        width={16}
                        height={12}
                        className="border border-white/20"
                      />
                      Translation
                    </Badge>
                  </div>
                  <Input
                    ref={inputRef}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type the translation..."
                    className={`h-14 text-lg font-semibold rounded-xl border-2 ${
                      answerState === 'correct' ? 'border-emerald-400 bg-emerald-50' :
                      answerState === 'wrong' ? 'border-red-400 bg-red-50' :
                      'focus:border-primary'
                    }`}
                    disabled={answerState !== 'idle'}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {answerState === 'idle' && (
                    <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={!typedAnswer.trim()}>
                      Check Answer
                    </Button>
                  )}
                  {answerState === 'wrong' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-red-700 mb-1">Correct answer:</p>
                      <p className="text-lg font-extrabold text-red-900">
                        {currentQuestion.item.translation}
                      </p>
                    </div>
                  )}
                </form>
              )}

              {currentQuestion.type === 'audio' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options!.map((option, idx) => {
                    const isSelected = selectedOption === idx
                    const isCorrect = idx === currentQuestion.correctIndex
                    let className = "h-auto min-h-[3.5rem] py-3 px-4 text-left rounded-2xl border-2 transition-all font-semibold text-sm sm:text-base"

                    if (answerState !== 'idle') {
                      if (isCorrect) {
                        className += " bg-emerald-50 border-emerald-400 text-emerald-700"
                      } else if (isSelected && !isCorrect) {
                        className += " bg-red-50 border-red-400 text-red-700"
                      } else {
                        className += " opacity-50"
                      }
                    } else {
                      className += " hover:border-primary/50 hover:bg-primary/5"
                    }

                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className={className}
                        onClick={() => handleAudioSelect(idx)}
                        disabled={answerState !== 'idle'}
                      >
                        <span className="flex items-center gap-2 w-full">
                          {answerState !== 'idle' && isCorrect && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          {answerState !== 'idle' && isSelected && !isCorrect && <X className="h-4 w-4 text-red-600 shrink-0" />}
                          <span className="break-words">{option}</span>
                        </span>
                      </Button>
                    )
                  })}
                </div>
              )}

              {/* Feedback + Next */}
              <AnimatePresence>
                {answerState !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm ${
                      answerState === 'correct'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {answerState === 'correct' ? (
                        <><Check className="h-4 w-4" /> Correct!</>
                      ) : (
                        <><X className="h-4 w-4" /> Not quite</>
                      )}
                    </div>

                    <Button
                      className="w-full h-12 rounded-xl font-bold"
                      onClick={advanceToNext}
                    >
                      {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
