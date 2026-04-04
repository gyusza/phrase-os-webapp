"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Volume2, 
  Headphones,
  Settings2,
  Mic,
  Repeat,
  Tally3,
  Languages,
  CheckCircle2
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
  scenario_id?: string | null
  scenario_title?: string | null
}

type Phase = 'idle' | 'source' | 'target' | 'pause' | 'complete'

export default function ListeningClient({ initialVocabulary }: { initialVocabulary: VocabularyItem[] }) {
  const [items, setItems] = useState<VocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [delay, setDelay] = useState(3000) // 3s repetition pause by default
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [isLooping, setIsLooping] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isTransitioningRef = useRef(false)

  // Initialize and Shuffle
  useEffect(() => {
    if (initialVocabulary.length > 0) {
      setItems([...initialVocabulary].sort(() => Math.random() - 0.5))
    }
  }, [initialVocabulary])

  const playAudio = (text: string, language: string, isTarget: boolean = true) => {
    return new Promise<void>(async (resolve) => {
      // 1. Try AI Voice (Target Language)
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
            audio.playbackRate = playbackSpeed
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
            audio.play().catch(() => resolve())
            return
          }
        } catch (error) {
          console.error('AI TTS failed, falling back:', error)
        }
      }

      // 2. Fallback to Browser Native
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = playbackSpeed * 0.9 // Keep browser voice slightly slower for clarity
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    })
  }

  const runSession = useCallback(async () => {
    if (!isPlaying || isTransitioningRef.current || items.length === 0) return
    isTransitioningRef.current = true

    const item = items[currentIndex]

    try {
      // Phase 1: Source Language (e.g. English)
      setPhase('source')
      await playAudio(item.word, item.language, false)
      await new Promise(r => setTimeout(r, 400)) // Tiny breath

      // Phase 2: Target Language (e.g. Danish)
      setPhase('target')
      await playAudio(item.translation, item.target_language, true)
      
      // Phase 3: Repetition Pause (Shadowing)
      setPhase('pause')
      await new Promise(r => setTimeout(r, delay))

      // Transition to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (isLooping) {
        setCurrentIndex(0) // Restart session
      } else {
        setIsPlaying(false)
        setPhase('complete')
      }
    } catch (err) {
      console.error("Session phase error:", err)
    } finally {
      isTransitioningRef.current = false
    }
  }, [isPlaying, currentIndex, items, delay, isLooping, playbackSpeed])

  useEffect(() => {
    if (isPlaying) {
      runSession()
    } else {
      window.speechSynthesis.cancel()
    }
  }, [isPlaying, currentIndex, runSession])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const handleNext = () => {
    setIsPlaying(false)
    setCurrentIndex(prev => (prev + 1) % items.length)
    setPhase('idle')
  }

  const handleBack = () => {
    setIsPlaying(false)
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length)
    setPhase('idle')
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20">
        <Headphones className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to Listen?</h2>
        <p className="text-muted-foreground max-w-xs mx-auto mb-8">
          Add at least one vocabulary item to start your car-friendly listening session.
        </p>
        <Button asChild className="rounded-2xl h-12 px-6">
          <Link href="/dashboard/scenarios/create">Build First Scenario</Link>
        </Button>
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const progress = ((currentIndex + 1) / items.length) * 100

  return (
    <div className="max-w-xl mx-auto px-4 py-8 md:py-16 space-y-12 h-full flex flex-col justify-center">
      
      {/* 1. Progress Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-4xl">Listening practice</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
              <Headphones className="h-4 w-4" />
              In-Car Focus Mode
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted/50 py-1.5 px-4 rounded-full border border-black/5">
             <Tally3 className="h-4 w-4" />
             {currentIndex + 1} of {items.length} Phrases
          </div>
        </div>
        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden border border-black/5">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
          />
        </div>
      </div>

      {/* 2. Main Display Card */}
      <div className="relative aspect-square md:aspect-[4/3] group">
        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <Card className="relative h-full w-full rounded-[2.5rem] border-4 border-white dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center p-8 overflow-hidden bg-white/80 dark:bg-black/20 backdrop-blur-3xl">
          <AnimatePresence mode="wait">
            {phase === 'complete' ? (
              <motion.div 
                key="complete"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="text-center space-y-8"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold mb-2">Practice done!</h2>
                  <p className="text-muted-foreground text-lg italic">You handled {items.length} phrases perfectly.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="lg" className="rounded-2xl px-8 font-bold h-14" onClick={() => window.location.reload()}>
                    <RotateCcw className="mr-2 h-5 w-5" /> Repeat Session
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={currentIndex + phase}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full text-center space-y-10"
              >
                <div className="flex flex-col items-center gap-4">
                  <Badge variant={phase === 'pause' ? 'secondary' : 'default'} className="px-6 py-1.5 text-sm font-bold rounded-full shadow-sm">
                    {phase === 'source' ? 'Understand meaning' : phase === 'target' ? 'Listen to sound' : phase === 'pause' ? 'Repeat now' : 'Get ready'}
                  </Badge>
                  {phase === 'pause' ? (
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-primary"
                    >
                      <Mic className="h-12 w-12" />
                    </motion.div>
                  ) : (
                    <div className="text-muted-foreground/30">
                      <Volume2 className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-foreground transition-all">
                    {phase === 'source' ? currentItem.word : currentItem.translation}
                  </h2>
                  <p className="text-xl font-medium text-muted-foreground italic flex items-center justify-center gap-2">
                    {phase === 'source' ? 'Original' : phase === 'target' ? 'Correct Pronunciation' : 'Your Turn'}
                  </p>
                </div>

                <div className="pt-4 opacity-20 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-bold text-muted-foreground">
                    {currentItem.scenario_title || 'Phrase practice'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative Corners */}
          <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-primary/5" />
          <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-primary/5" />
        </Card>
      </div>

      {/* 3. Controls Tier */}
      <div className="flex flex-col items-center gap-12">
        
        {/* Main Controls */}
        <div className="flex items-center gap-6 sm:gap-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-full text-muted-foreground hover:bg-black/5 transition-transform active:scale-95"
            onClick={handleBack}
          >
            <SkipBack className="h-8 w-8 sm:h-10 sm:w-10" />
          </Button>

          <Button 
            size="icon" 
            className={`h-28 w-28 sm:h-32 sm:w-32 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-[8px] border-white dark:border-white/10 transition-all active:scale-90 ${
              isPlaying ? 'bg-zinc-800 dark:bg-zinc-100 hover:bg-zinc-900' : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-12 w-12 sm:h-16 sm:w-16 text-white dark:text-black fill-current" />
            ) : (
              <Play className="h-12 w-12 sm:h-16 sm:w-16 ml-1.5 text-white fill-current" />
            )}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-full text-muted-foreground hover:bg-black/5 transition-transform active:scale-95"
            onClick={handleNext}
          >
            <SkipForward className="h-8 w-8 sm:h-10 sm:w-10" />
          </Button>
        </div>

        {/* Setting Tier */}
        <div className="grid grid-cols-2 md:flex items-center gap-6 w-full max-w-lg">
          <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-2xl border border-black/5 col-span-2 md:col-span-1">
            <Badge variant="outline" className="bg-white/50 border-none px-3 font-bold">PAUSE</Badge>
            {[2, 4, 6].map((sec) => (
              <Button
                key={sec}
                variant={delay === sec * 1000 ? "default" : "ghost"}
                size="sm"
                className={`flex-1 h-10 font-black rounded-xl ${delay === sec * 1000 ? 'text-white' : 'text-muted-foreground'}`}
                onClick={() => setDelay(sec * 1000)}
              >
                {sec}s
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isLooping ? "default" : "outline"}
              className={`h-14 px-6 rounded-2xl flex-1 font-black gap-2 border-none shadow-sm ${isLooping ? '' : 'bg-muted/40'}`}
              onClick={() => setIsLooping(!isLooping)}
            >
              <Repeat className={`h-5 w-5 ${isLooping ? '' : 'text-muted-foreground/50'}`} />
              LOOP
            </Button>
            <Button
              variant="outline"
              className="h-14 px-6 rounded-2xl flex-1 font-black gap-2 border-none bg-muted/40 shadow-sm"
              onClick={() => setPlaybackSpeed(prev => prev === 1.0 ? 0.8 : 1.0)}
            >
              <div className="h-5 w-5 bg-muted-foreground/20 rounded flex items-center justify-center text-[10px]">
                {playbackSpeed}x
              </div>
              SPEED
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
