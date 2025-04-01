"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface VocabularyItem {
  id: string
  word: string
  translation: string
  language: string
  target_language: string
  metadata: {
    category?: string
  }
}

export default function RecentVocabulary() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchVocabulary()
  }, [])

  const fetchVocabulary = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setVocabulary(data || [])
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      toast({
        title: "Error",
        description: "Failed to load vocabulary items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading vocabulary...
      </div>
    )
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
                    <img 
                      src={`https://flagcdn.com/16x12/${getFlagCode(item.language)}.png`}
                      alt={getLanguageName(item.language)}
                      className="h-3"
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
                    <img 
                      src={`https://flagcdn.com/16x12/${getFlagCode(item.target_language)}.png`}
                      alt={getLanguageName(item.target_language)}
                      className="h-3"
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