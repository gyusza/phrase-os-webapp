"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Mic, BarChart2, Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAnalysisData, saveAnalysis } from "@/lib/actions/analyze"
import { createMultipleVocabulary } from "@/lib/actions/vocabulary"

interface Recording {
  id: string
  title: string
  audio_url: string
  duration: number
  created_at: string
  language: string
  transcription: string | null
  status: 'new' | 'analyzed' | string
}

interface AnalyzedItem {
  id: string
  text: string
  type: 'word' | 'expression' | 'sentence'
  explanation: string
  selected: boolean
  translation?: string
}

interface UserSettings {
  target_language: string
}

interface SavedAnalysis {
  id: string
  recording_id: string
  items: SavedAnalysisItem[]
  created_at: string
}

interface SavedAnalysisItem {
  id: string
  text: string
  type: 'word' | 'expression' | 'sentence'
  explanation: string
}

interface TranslationResponse {
  translations: Array<{
    text: string
    translation: string
    explanation: string
  }>
}

export default function AnalyzeRecordingPage() {
  const params = useParams<{ id: string }>()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([])
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  const fetchRecording = useCallback(async () => {
    try {
      const data: any = await getAnalysisData(params.id)

      setRecording(data.recording)
      setUserSettings(data.settings)

      const analysesData = data.analyses
      if (analysesData && analysesData.length > 0) {
        const mostRecentAnalysis = analysesData[0]
        
        let existingWords = new Set<string>()
        if (data.existingWords && data.existingWords.length > 0) {
          existingWords = new Set(data.existingWords)
        }

        setAnalyzedItems(mostRecentAnalysis.items.map((item: SavedAnalysisItem) => ({
          ...item,
          selected: false,
          translation: existingWords.has(item.text.toLowerCase()) ? "Already in vocabulary" : undefined
        })))
        setSelectedAnalysisId(mostRecentAnalysis.id)
        setSavedAnalyses(analysesData)
      } else {
        setAnalyzedItems([])
      }
    } catch (error: any) {
      console.error('Error fetching recording:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load recording details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    fetchRecording()
  }, [fetchRecording])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (days === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const playRecording = async () => {
    if (!recording) return

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(recording.audio_url)
        audioRef.current.onended = () => setIsPlaying(false)
        audioRef.current.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to play the recording. Please try again.",
            variant: "destructive",
          })
          setIsPlaying(false)
        }
      }

      if (isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.error('Error playing audio:', error)
      toast({
        title: "Error",
        description: "Failed to play the recording. Please try again.",
        variant: "destructive",
      })
      setIsPlaying(false)
    }
  }

  const analyzeRecording = async (forceNew: boolean = false) => {
    try {
      setIsAnalyzing(true)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: recording?.transcription,
          language: recording?.language,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze recording')
      }

      const data = await response.json()
      setAnalyzedItems(data.items.map((item: AnalyzedItem) => ({
        ...item,
        selected: false,
        translation: undefined
      })))

      const analysisData: any = await saveAnalysis(params.id, data.items)

      // Update saved analyses list
      setSavedAnalyses(prev => [analysisData, ...(prev || [])])
      setSelectedAnalysisId(analysisData.id)

      if (recording) {
        setRecording({ ...recording, status: 'analyzed' })
      }

      toast({
        title: "Success",
        description: "Recording analyzed successfully",
      })
    } catch (error) {
      console.error('Error analyzing recording:', error)
      toast({
        title: "Error",
        description: "Failed to analyze recording",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleItemSelect = (itemId: string) => {
    setAnalyzedItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const handleSaveToVocabulary = async () => {
    try {
      console.log('\n[Analyze Client] Starting handleSaveToVocabulary process...')
      setIsSaving(true)
      const selectedItems = analyzedItems.filter((item: AnalyzedItem) => item.selected)
      console.log(`[Analyze Client] Total items selected by user: ${selectedItems.length}`)

      if (selectedItems.length === 0) {
        toast({
          title: "No items selected",
          description: "Please select at least one item to add to your vocabulary.",
          variant: "destructive",
        })
        return
      }

      if (!recording?.language) {
        toast({
          title: "Error",
          description: "Source language is missing.",
          variant: "destructive",
        })
        return
      }

      const data: any = await getAnalysisData(params.id)
      const existingWords = new Set(data?.existingWords || [])
      console.log(`[Analyze Client] Identified ${existingWords.size} words that already exist in user's vocabulary.`)
      
      const newItems = selectedItems.filter(item => !existingWords.has(item.text.toLowerCase()))
      console.log(`[Analyze Client] Items filtered out. New distinct items to insert: ${newItems.length}`)

      if (newItems.length === 0) {
        toast({
          title: "No new items",
          description: "All selected items are already in your vocabulary.",
        })
        return
      }

      const targetLanguage = userSettings?.target_language || 'da'
      console.log(`[Analyze Client] Sending translation request to backend for new items format. Target Language: ${targetLanguage}`)

      const translateResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: newItems.map(item => ({
            text: item.text,
            type: item.type,
          })),
          sourceLanguage: recording.language,
          targetLanguage,
        }),
      })

      if (!translateResponse.ok) {
        throw new Error('Failed to translate items')
      }

      const translationData = await translateResponse.json() as TranslationResponse

      if (!translationData.translations) {
        throw new Error('Invalid translation response format')
      }

      const vocabularyItems = newItems.map((item: AnalyzedItem, index) => {
        const translation = translationData.translations[index]
        if (!translation) {
          throw new Error(`Missing translation for item: ${item.text}`)
        }

        return {
          word: item.text,
          translation: translation.translation,
          language: recording.language,
          target_language: targetLanguage,
          context: translation.explanation || null,
          example_sentence: item.type === 'sentence' ? item.text : null,
          metadata: {
            type: item.type,
            recording_id: recording.id,
          }
        }
      })

      console.log(`[Analyze Client] Successfully mapped and created local payload. Invoking createMultipleVocabulary...`)
      await createMultipleVocabulary(vocabularyItems)
      console.log(`[Analyze Client] API call to createMultipleVocabulary succeeded!`)

      setAnalyzedItems(items =>
        items.map(item => ({
          ...item,
          selected: false,
          translation: existingWords.has(item.text.toLowerCase()) ? "Already in vocabulary" : item.translation
        }))
      )

      toast({
        title: "Success",
        description: `Added ${newItems.length} new items to your vocabulary.`,
      })

      fetchRecording()
    } catch (error) {
      console.error('Error saving to vocabulary:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save items to vocabulary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!recording) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Recording not found</h2>
        <p className="text-muted-foreground">The recording you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{recording.title}</h1>
            <p className="text-muted-foreground">
              {formatDate(recording.created_at)}
            </p>
          </div>
          <Button onClick={playRecording} className="flex items-center gap-2">
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Transcription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{recording.transcription}</p>
          </CardContent>
        </Card>

        {recording.status === 'new' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Analysis
                </div>
                {savedAnalyses.length > 0 && (
                  <div className="flex items-center gap-4">
                    <select
                      className="form-select rounded-md border text-sm py-1 px-2 pr-8"
                      value={selectedAnalysisId || ''}
                      onChange={(e) => {
                        const analysis = savedAnalyses.find(a => a.id === e.target.value)
                        if (analysis) {
                          setAnalyzedItems(analysis.items.map((item: SavedAnalysisItem) => ({
                            ...item,
                            selected: false,
                            translation: undefined
                          })))
                          setSelectedAnalysisId(analysis.id)
                        }
                      }}
                    >
                      <option value="">Select analysis</option>
                      {savedAnalyses.map((analysis) => (
                        <option key={analysis.id} value={analysis.id}>
                          Analysis {new Date(analysis.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => analyzeRecording(true)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyzedItems.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Click the button below to analyze this recording and extract important words, expressions, and sentences.
                  </p>
                  <Button 
                    onClick={() => analyzeRecording(false)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart2 className="h-4 w-4" />
                        Analyze Recording
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Select the items you want to add to your vocabulary:
                    </p>
                    <Button 
                      onClick={handleSaveToVocabulary}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Save Selected to Vocabulary'
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      {analyzedItems.map((item) => {
                        const isInVocabulary = item.translation === "Already in vocabulary"
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-4 p-4 rounded-lg border"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.selected}
                              onCheckedChange={() => handleItemSelect(item.id)}
                              disabled={isSaving || isInVocabulary}
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.text}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {item.type}
                                </span>
                                {isInVocabulary && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    Already in vocabulary
                                  </span>
                                )}
                              </div>
                              {item.translation && !isInVocabulary && (
                                <p className="text-sm text-muted-foreground">
                                  {item.translation}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Analysis
                </div>
                {savedAnalyses.length > 0 && (
                  <div className="flex items-center gap-4">
                    <select
                      className="form-select rounded-md border text-sm py-1 px-2 pr-8"
                      value={selectedAnalysisId || ''}
                      onChange={(e) => {
                        const analysis = savedAnalyses.find(a => a.id === e.target.value)
                        if (analysis) {
                          setAnalyzedItems(analysis.items.map((item: SavedAnalysisItem) => ({
                            ...item,
                            selected: false,
                            translation: undefined
                          })))
                          setSelectedAnalysisId(analysis.id)
                        }
                      }}
                    >
                      <option value="">Select analysis</option>
                      {savedAnalyses.map((analysis) => (
                        <option key={analysis.id} value={analysis.id}>
                          Analysis {new Date(analysis.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => analyzeRecording(true)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze"}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyzedItems.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This recording has been analyzed before. Click the button below to view the analysis results again.
                  </p>
                  <Button 
                    onClick={() => analyzeRecording(false)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Analysis...
                      </>
                    ) : (
                      <>
                        <BarChart2 className="h-4 w-4" />
                        View Analysis
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Select the items you want to add to your vocabulary:
                    </p>
                    <Button 
                      onClick={handleSaveToVocabulary}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Save Selected to Vocabulary'
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      {analyzedItems.map((item) => {
                        const isInVocabulary = item.translation === "Already in vocabulary"
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-4 p-4 rounded-lg border"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.selected}
                              onCheckedChange={() => handleItemSelect(item.id)}
                              disabled={isSaving || isInVocabulary}
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.text}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {item.type}
                                </span>
                                {isInVocabulary && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    Already in vocabulary
                                  </span>
                                )}
                              </div>
                              {item.translation && !isInVocabulary && (
                                <p className="text-sm text-muted-foreground">
                                  {item.translation}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}