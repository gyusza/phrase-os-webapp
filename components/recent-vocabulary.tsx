"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useEffect, useState, useCallback } from "react"
import { getVocabulary } from "@/lib/actions/vocabulary"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  metadata: {
    category?: string
  } | any
}

export default function RecentVocabulary({ initialVocabulary }: { initialVocabulary: VocabularyItem[] }) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(initialVocabulary)
  const { toast } = useToast()

  const playAudio = (text: string, language: string) => {
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
      default: return 'gb'
    }
  }

  const getLanguageName = (language: string) => {
    switch (language) {
      case 'en': return 'English'
      case 'da': return 'Danish'
      case 'hu': return 'Hungarian'
      default: return 'English'
    }
  }



  if (vocabulary.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No vocabulary items found. Start by recording or adding new phrases!
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {vocabulary.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{item.word}</span>
                    <Image 
                      src={`https://flagcdn.com/16x12/${getFlagCode(item.language)}.png`}
                      alt={getLanguageName(item.language)}
                      width={16}
                      height={12}
                      className="h-3 w-4"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => playAudio(item.word, item.language)}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{item.translation}</span>
                    <Image 
                      src={`https://flagcdn.com/16x12/${getFlagCode(item.target_language)}.png`}
                      alt={getLanguageName(item.target_language)}
                      width={16}
                      height={12}
                      className="h-3 w-4"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => playAudio(item.translation, item.target_language)}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {item.metadata?.category && (
                  <Badge variant="outline" className="mt-1">
                    {item.metadata.category}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}