"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2, Sparkles } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useEffect, useState, useCallback } from "react"
import { getVocabulary } from "@/lib/actions/vocabulary"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import Link from "next/link"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  scenario_id: string | null
  scenario_title: string | null
  metadata: {
    category?: string
  } | any
}

export default function RecentVocabulary({ initialVocabulary }: { initialVocabulary: VocabularyItem[] }) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(initialVocabulary)
  const { toast } = useToast()

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

    // Fallback or Source language: Browser TTS
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.8
    
    const voices = window.speechSynthesis.getVoices()
    const languageVoices = voices.filter(voice => voice.lang.startsWith(language))
    const preferredVoice = languageVoices.find(voice => !voice.localService) || 
                          languageVoices[0]
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    
    try {
      utterance.lang = language
    } catch (error) {
      console.warn('Could not set language for TTS:', error)
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const getFlagCode = (language: string) => {
    switch (language) {
      case 'en': return 'gb'
      case 'da': return 'dk'
      case 'hu': return 'hu'
      case 'de': return 'de'
      default: return 'gb'
    }
  }

  const getLanguageName = (language: string) => {
    switch (language) {
      case 'en': return 'English'
      case 'da': return 'Danish'
      case 'hu': return 'Hungarian'
      case 'de': return 'German'
      default: return 'English'
    }
  }

  if (vocabulary.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No vocabulary items found. Start by creating a scenario or adding new phrases!
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {vocabulary.map((item) => (
        <Card key={item.id} className="hover:border-primary/50 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
                  <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
                    {/* Source side */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">{item.word}</span>
                      <Image 
                        src={`https://flagcdn.com/16x12/${getFlagCode(item.language)}.png`}
                        alt={getLanguageName(item.language)}
                        width={16}
                        height={12}
                        className="h-3 w-4 border shrink-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8"
                        onClick={() => playAudio(item.word, item.language, false)}
                      >
                        <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>

                    {/* Divider on desktop */}
                    <span className="hidden sm:inline text-muted-foreground">→</span>

                    {/* Target side */}
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg sm:text-base bg-primary/5 px-2 py-0.5 rounded-sm border border-primary/10 text-primary">{item.translation}</span>
                      <Image 
                        src={`https://flagcdn.com/16x12/${getFlagCode(item.target_language)}.png`}
                        alt={getLanguageName(item.target_language)}
                        width={16}
                        height={12}
                        className="h-3 w-4 border shrink-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8"
                        onClick={() => playAudio(item.translation, item.target_language, true)}
                      >
                        <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    {item.scenario_id && item.scenario_title && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/10 p-0">
                            <Link href={`/dashboard/scenarios/${item.scenario_id}/analyze`} className="flex items-center gap-1 px-2 py-0.5">
                                <Sparkles className="h-2.5 w-2.5" />
                                {item.scenario_title}
                            </Link>
                        </Badge>
                    )}
                    {item.metadata?.category && (
                        <Badge variant="outline" className="text-[10px] h-5">
                            {item.metadata.category}
                        </Badge>
                    )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}