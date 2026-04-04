"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Play, Pause, RotateCcw, Check, SkipForward, ArrowLeft, Mic } from 'lucide-react'
import { Progress } from "@/components/ui/progress"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
}

export default function PassiveListening({ items }: { items: VocabularyItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mode, setMode] = useState<"listening" | "repeating" | "idle">("idle")
  const [progress, setProgress] = useState(0)
  const router = useRouter()
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const currentItem = items[currentIndex]

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (synth) synth.cancel()
    }
  }, [synth])

  const speak = async (text: string, lang: string, isTarget: boolean = true) => {
    if (!synth) return
    synth.cancel()

    if (isTarget) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: lang })
        })
        const data = await response.json()
        if (data.audio) {
          const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`)
          audio.onended = () => {
             if (isPlaying) {
               setMode("repeating")
               startRepetitionTimer()
             }
          }
          audio.onerror = () => {
             if (isPlaying) {
               setMode("repeating")
               startRepetitionTimer()
             }
          }
          audio.play()
          return
        }
      } catch (error) {
        console.error('Gemini TTS failed, falling back to browser TTS:', error)
      }
    }

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Attempt to find a matching voice
    const voices = synth.getVoices()
    const voice = voices.find(v => v.lang.startsWith(lang)) || voices.find(v => v.lang.startsWith('en'))
    if (voice) utterance.voice = voice
    
    utterance.rate = 0.8
    utterance.onend = () => {
       if (isPlaying) {
         setMode("repeating")
         startRepetitionTimer()
       }
    }
    synth.speak(utterance)
  }

  const startRepetitionTimer = () => {
    let timeLeft = 3000 // 3 seconds pause
    const interval = 100
    
    const tick = () => {
      timeLeft -= interval
      if (timeLeft <= 0) {
        setMode("idle")
        if (currentIndex < items.length - 1) {
          setCurrentIndex(prev => prev + 1)
          // Small delay before next word
          timerRef.current = setTimeout(() => {
             setMode("listening")
          }, 1000)
        } else {
          setIsPlaying(false)
          setMode("idle")
        }
      } else {
        timerRef.current = setTimeout(tick, interval)
      }
    }
    tick()
  }

  useEffect(() => {
    if (isPlaying && mode === "listening") {
      speak(currentItem.word, currentItem.language || 'da', false)
    }
  }, [currentIndex, isPlaying, mode])

  const togglePlay = () => {
    const nextState = !isPlaying
    setIsPlaying(nextState)
    if (nextState) {
      setMode("listening")
    } else {
      if (synth) synth.cancel()
      if (timerRef.current) clearTimeout(timerRef.current)
      setMode("idle")
    }
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setMode("idle")
    }
  }

  const sessionProgress = (currentIndex / items.length) * 100

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Session Progress</span>
          <span>{currentIndex + 1} / {items.length}</span>
        </div>
        <Progress value={sessionProgress} className="h-2" />
      </div>

      <Card className={`h-80 flex flex-col items-center justify-center text-center p-8 border-2 transition-all duration-500 ${
        mode === 'listening' ? 'border-blue-500 bg-blue-50 shadow-blue-100' : 
        mode === 'repeating' ? 'border-green-500 bg-green-50 shadow-green-100' : 'bg-white'
      }`}>
        <CardContent className="p-0 space-y-6">
          <div className="flex justify-center">
            {mode === 'listening' ? (
              <div className="p-4 rounded-full bg-blue-500 text-white animate-pulse">
                <Volume2 className="w-12 h-12" />
              </div>
            ) : mode === 'repeating' ? (
              <div className="p-4 rounded-full bg-green-500 text-white animate-bounce">
                <Mic className="w-12 h-12" />
              </div>
            ) : (
              <div className="p-4 rounded-full bg-slate-100 text-slate-400">
                <Volume2 className="w-12 h-12" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">{currentItem.word}</h2>
            <p className="text-xl text-muted-foreground">{currentItem.translation}</p>
          </div>

          <p className="font-semibold text-xs text-muted-foreground/60">
            {mode === 'listening' ? 'Listen carefully' : 
             mode === 'repeating' ? 'Repeat it out loud' : 'Ready?'}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="outline" onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0}>
             <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button size="lg" className={`w-48 h-16 text-lg gap-2 ${isPlaying ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary/90'}`} onClick={togglePlay}>
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6" />
                Pause Tape
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start Tape
              </>
            )}
          </Button>

          <Button size="icon" variant="outline" onClick={handleNext} disabled={currentIndex === items.length - 1}>
             <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground max-w-xs text-center">
          Words will play automatically with a 3-second pause for you to repeat the pronunciation.
        </p>
      </div>
    </div>
  )
}
