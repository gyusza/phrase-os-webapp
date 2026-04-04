"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, Mic, BarChart2, Loader2, Sparkles, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAnalysisData, saveAnalysis } from "@/lib/actions/analyze"
import { createMultipleVocabulary } from "@/lib/actions/vocabulary"

interface Scenario {
  id: string
  title: string
  audio_url: string | null
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
  scenario_id: string
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

export default function AnalyzeScenarioPage() {
  const params = useParams<{ id: string }>()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([])
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchScenario = useCallback(async () => {
    try {
      const data: any = await getAnalysisData(params.id)

      setScenario(data.scenario)
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
      console.error('Error fetching scenario:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load scenario details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, toast])

  useEffect(() => {
    fetchScenario()
  }, [fetchScenario])

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


  const analyzeScenario = async (forceNew: boolean = false) => {
    try {
      setIsAnalyzing(true)

      const isAIScenario = scenario?.audio_url?.startsWith('ai://')

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: scenario?.transcription,
          language: scenario?.language,
          isAIScenario: isAIScenario, // Tell API to generate fresh instead of just extracting
          forceNew: forceNew
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze scenario')
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

      if (scenario) {
        setScenario({ ...scenario, status: 'analyzed' })
      }

      toast({
        title: "Success",
        description: isAIScenario ? "Fresh vocabulary generated for your scenario!" : "Scenario analyzed successfully",
      })
    } catch (error) {
      console.error('Error analyzing scenario:', error)
      toast({
        title: "Error",
        description: "Failed to analyze scenario",
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

      if (!scenario?.language) {
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
          sourceLanguage: scenario.language,
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
          language: scenario.language,
          target_language: targetLanguage,
          context: translation.explanation || null,
          example_sentence: item.type === 'sentence' ? item.text : null,
          scenario_id: scenario.id,
          metadata: {
            type: item.type,
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

      fetchScenario()
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

  if (!scenario) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Scenario not found</h2>
        <p className="text-muted-foreground">The scenario you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    )
  }

  const isAIScenario = scenario.audio_url?.startsWith('ai://')
  const isPastedText = scenario.audio_url?.startsWith('text://')

  return (
    <div className="py-2 sm:py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 sm:border-0 sm:pb-0">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{scenario.title}</h1>
            <p className="text-xs sm:text-base text-muted-foreground">
              {formatDate(scenario.created_at)}
            </p>
          </div>
          {scenario.audio_url && !isPastedText && !isAIScenario && (
            <div className="w-full sm:w-auto">
              <audio controls preload="none" src={scenario.audio_url} className="h-10 w-full sm:max-w-sm outline-hidden rounded-lg bg-muted" />
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAIScenario ? <Sparkles className="h-5 w-5" /> : isPastedText ? <FileText className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isAIScenario ? "Scenario Context" : isPastedText ? "Input Text" : "Transcription"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{scenario.transcription}</p>
          </CardContent>
        </Card>

        {scenario.status === 'new' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-2 text-xl sm:text-2xl">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Analysis
                </div>
                {savedAnalyses.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      className="form-select rounded-lg border text-sm py-2 px-3 pr-8 bg-background h-10 w-full sm:w-auto"
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
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => analyzeScenario(true)}
                      disabled={isAnalyzing}
                      variant="outline"
                      size="sm"
                      className="gap-2 h-10 sm:h-9 font-semibold"
                    >
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
                      Regenerate
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyzedItems.length === 0 ? (
                <div className="space-y-4 text-center py-8">
                  <p className="text-muted-foreground">
                    {isAIScenario 
                      ? "Generate vocabulary items based on this scenario description." 
                      : "Analyze this scenario to extract important words and expressions."}
                  </p>
                  <Button 
                    onClick={() => analyzeScenario(false)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 mx-auto"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        {isAIScenario ? <Sparkles className="h-5 w-5" /> : <BarChart2 className="h-5 w-5" />}
                        {isAIScenario ? "Generate Vocabulary" : "Analyze Scenario"}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Select phrases and words to add to your personalized vocabulary:
                    </p>
                    <Button 
                      onClick={handleSaveToVocabulary}
                      disabled={isSaving}
                      className="w-full sm:w-auto h-11 sm:h-10 font-bold"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Save Selected'
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
                            className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 border-primary/5 hover:border-primary/20 transition-all bg-card/50"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.selected}
                              onCheckedChange={() => handleItemSelect(item.id)}
                              disabled={isSaving || isInVocabulary}
                              className="mt-1 h-5 w-5 sm:h-4 sm:w-4"
                            />
                            <div className="flex-1 space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-base sm:text-lg text-primary">{item.text}</span>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {item.type}
                                </span>
                                {isInVocabulary && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    Saved
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 leading-snug">
                                {item.explanation}
                              </p>
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
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-2 text-xl sm:text-2xl">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Analysis
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {savedAnalyses.length > 0 && (
                      <select
                        className="form-select rounded-lg border text-sm py-2 px-3 pr-8 bg-background h-10 w-full sm:w-auto"
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
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      onClick={() => analyzeScenario(true)}
                      disabled={isAnalyzing}
                      variant="outline"
                      size="sm"
                      className="gap-2 h-10 sm:h-9 font-semibold"
                    >
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
                      Regenerate
                    </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyzedItems.length === 0 ? (
                <div className="space-y-4 text-center py-8">
                  <p className="text-muted-foreground">
                    Load previous analysis or generate a new one.
                  </p>
                  <Button 
                    onClick={() => analyzeScenario(false)}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 mx-auto"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
                    View Analysis
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Select phrases and words to add to your personalized vocabulary:
                    </p>
                    <Button 
                      onClick={handleSaveToVocabulary}
                      disabled={isSaving}
                      className="w-full sm:w-auto h-11 sm:h-10 font-bold"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Save Selected'
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
                            className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 border-primary/5 hover:border-primary/20 transition-all bg-card/50"
                          >
                            <Checkbox
                              id={item.id}
                              checked={item.selected}
                              onCheckedChange={() => handleItemSelect(item.id)}
                              disabled={isSaving || isInVocabulary}
                              className="mt-1 h-5 w-5 sm:h-4 sm:w-4"
                            />
                            <div className="flex-1 space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-base sm:text-lg text-primary">{item.text}</span>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {item.type}
                                </span>
                                {isInVocabulary && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    Saved
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 leading-snug">
                                {item.explanation}
                              </p>
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