"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Mic, Square, Loader2, Play, RefreshCcw, Pause, Upload, FileText, Sparkles, BarChart2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { createScenario, updateScenario } from "@/lib/actions/scenarios"
import { getAnalysisData, saveAnalysis } from "@/lib/actions/analyze"
import { createMultipleVocabulary } from "@/lib/actions/vocabulary"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ScenarioCreationInterfaceProps {
  sourceLanguages: string[]
  targetLanguage: string
}

interface ScenarioDetails {
  id: string
  title: string
  audio_url: string | null
  transcription: string
  duration: number
  language: string
  status: 'new' | 'analyzed' | string
  metadata?: any
}

export function ScenarioCreationInterface({ sourceLanguages, targetLanguage }: ScenarioCreationInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [completedScenario, setCompletedScenario] = useState<ScenarioDetails | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newVocabularyAdded, setNewVocabularyAdded] = useState<any[]>([])
  
  const [pendingVocabulary, setPendingVocabulary] = useState<any[]>([])
  const [checkedVocabularyIndices, setCheckedVocabularyIndices] = useState<Set<number>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  
  const [pastedText, setPastedText] = useState("")
  const [scenarioContext, setScenarioContext] = useState("")
  const [audioSource, setAudioSource] = useState<'record' | 'upload' | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [accordionValue, setAccordionValue] = useState<string>("ai-scenario")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef(0)
  const { toast } = useToast()

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      durationRef.current = 0
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const updated = prev + 1
          durationRef.current = updated
          return updated
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setRecordingTime(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType })
        const recordedDuration = durationRef.current
        
        if (audioBlob.size === 0) {
          toast({
            title: "Recording Error",
            description: "No audio data was captured.",
            variant: "destructive",
          })
          setRecordingTime(0)
          return
        }

        if (recordedDuration < 1) {
          toast({
            title: "Recording Too Short",
            description: "The audio was too short to analyze.",
            variant: "destructive",
          })
          setRecordingTime(0)
          return
        }

        await handleRecordingComplete(audioBlob, recordedDuration)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(250)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioUrl: string, sourceLanguages: string[]) => {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl, sourceLanguages })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      const { transcription, detectedLanguage } = await response.json()
      return { transcription, detectedLanguage }
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  const finalizeProcessing = async (scenario: any, transcription: string, detectedLanguage: string, sourceTab: string) => {
    setCompletedScenario(scenario)
    setAccordionValue(sourceTab)
    setIsAnalyzing(true)
    try {
      console.log('Automated analysis started...')
      const isAIScenario = scenario.audio_url?.startsWith('ai://')

      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription,
          language: detectedLanguage,
          isAIScenario: isAIScenario
        }),
      })

      if (!analyzeResponse.ok) throw new Error('Failed to analyze content')
      const analyzeData = await analyzeResponse.json()
      const analyzedItems = analyzeData.items
      
      // Use detected language from API response when available
      const actualLanguage = analyzeData.detectedLanguage || detectedLanguage
      
      // Validate detected language against user's source languages
      if (!sourceLanguages.includes(actualLanguage)) {
        toast({
          title: "Language Mismatch",
          description: `Detected language (${actualLanguage}) doesn't match your configured source languages. Please check your language settings or try again.`,
          variant: "destructive",
        })
        setIsAnalyzing(false)
        setIsProcessing(false)
        return
      }

      // Update scenario language if it was 'any' or 'auto'
      if (scenario.language === 'any' || scenario.language === 'auto' || scenario.language !== actualLanguage) {
        await updateScenario(scenario.id, { language: actualLanguage })
        setCompletedScenario({ ...scenario, language: actualLanguage })
      }

      // Save analysis to db silently
      await saveAnalysis(scenario.id, analyzedItems)
      
      // Translate and add to vocabulary
      const dynamicAnalysisData: any = await getAnalysisData(scenario.id)
      const existingWords = new Set(dynamicAnalysisData?.existingWords || [])
      
      const newItems = analyzedItems.filter((item: any) => !existingWords.has(item.text.toLowerCase()))

      if (newItems.length > 0) {
        console.log(`Starting translation for ${newItems.length} new items`)
        const translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: newItems.map((item: any) => ({
              text: item.text,
              type: item.type,
            })),
            sourceLanguage: actualLanguage,
            targetLanguage,
          }),
        })
        if (!translateResponse.ok) throw new Error('Failed to translate items')
        const translationData = await translateResponse.json()
        
        const vocabularyItems = newItems.map((item: any, index: number) => {
          const translation = translationData.translations[index]
          return {
            word: item.text,
            translation: translation.translation,
            language: actualLanguage,
            target_language: targetLanguage,
            context: translation.explanation || null,
            example_sentence: item.type === 'sentence' ? item.text : null,
            scenario_id: scenario.id,
            metadata: {
              type: item.type,
              source: sourceTab,
            }
          }
        })

        setPendingVocabulary(vocabularyItems)
        setCheckedVocabularyIndices(new Set(vocabularyItems.map((_: any, i: number) => i)))
        toast({
          title: "Scenario Ready",
          description: `Extracted ${vocabularyItems.length} expressions for review.`,
        })
      } else {
        toast({
          title: "Analysis Complete",
          description: "No brand new vocabulary to add.",
        })
      }
    } catch (analyzeErr) {
      console.error('Error during automated analysis:', analyzeErr)
      toast({
        title: "Analysis Error",
        description: "Failed to extract vocabulary. You can try again from the scenarios list.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
      setIsProcessing(false)
      setIsTranscribing(false)
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob, recordedDuration: number) => {
    setIsProcessing(true)
    try {
      console.log('Uploading audio file locally...')
      let extension = 'webm'
      if (audioBlob.type.includes('mp4')) extension = 'mp4'
      else if (audioBlob.type.includes('ogg')) extension = 'ogg'
      else if (audioBlob.type.includes('wav')) extension = 'wav'
      else if (audioBlob.type.includes('webm')) extension = 'webm'

      const formData = new FormData()
      formData.append('file', audioBlob, `recording.${extension}`)
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')
      
      const { url: publicUrl } = await uploadRes.json()
      setIsTranscribing(true)
      const { transcription, detectedLanguage } = await transcribeAudio(publicUrl, sourceLanguages)

      const scenarioData = {
        title: `Audio Scenario ${new Date().toLocaleString()}`,
        audio_url: publicUrl,
        language: detectedLanguage,
        duration: recordedDuration,
        transcription,
        status: 'new',
        metadata: {
          source_languages: sourceLanguages,
          target_language: targetLanguage,
          detected_language: detectedLanguage,
          source_tab: 'audio-scenario'
        }
      }

      const scenario: any = await createScenario(scenarioData)
      await finalizeProcessing(scenario, transcription, detectedLanguage, 'audio-scenario')
    } catch (error) {
      console.error('Error processing audio:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process audio.",
        variant: "destructive",
      })
      setIsProcessing(false)
      setIsTranscribing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')
      
      const { url: publicUrl } = await uploadRes.json()
      setIsTranscribing(true)
      setIsUploading(false)
      
      const { transcription, detectedLanguage } = await transcribeAudio(publicUrl, sourceLanguages)

      const scenarioData = {
        title: `Upload: ${file.name}`,
        audio_url: publicUrl,
        language: detectedLanguage,
        duration: 0,
        transcription,
        status: 'new',
        metadata: {
          file_name: file.name,
          source_languages: sourceLanguages,
          target_language: targetLanguage,
          detected_language: detectedLanguage,
          source_tab: 'audio-scenario'
        }
      }

      const scenario: any = await createScenario(scenarioData)
      await finalizeProcessing(scenario, transcription, detectedLanguage, 'audio-scenario')
    } catch (error) {
      console.error('Error processing upload:', error)
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to process file.",
        variant: "destructive",
      })
      setIsProcessing(false)
      setIsTranscribing(false)
      setIsUploading(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return

    setIsProcessing(true)
    setIsAnalyzing(true)
    try {
      const scenarioData = {
        title: `Text Snippet ${new Date().toLocaleString()}`,
        audio_url: "text://pasted",
        language: "auto",
        duration: 0,
        transcription: pastedText,
        status: 'new',
        metadata: {
          input_method: "paste",
          source_languages: sourceLanguages,
          target_language: targetLanguage,
          source_tab: "upload-text",
        }
      }

      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: pastedText,
          language: "any",
        }),
      })

      if (!analyzeResponse.ok) throw new Error('Failed to analyze text')
      const analyzeData = await analyzeResponse.json()
      const detectedLanguage = analyzeData.detectedLanguage || sourceLanguages[0] || "en"
      scenarioData.language = detectedLanguage

      const scenario: any = await createScenario(scenarioData)
      await finalizeProcessing(scenario, pastedText, detectedLanguage, 'upload-text')
    } catch (error) {
      console.error('Error processing text:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process text.",
        variant: "destructive",
      })
      setIsProcessing(false)
      setIsAnalyzing(false)
    }
  }

  const handleAIScenarioSubmit = async () => {
    if (!scenarioContext.trim()) return

    setIsProcessing(true)
    setIsAnalyzing(true)
    try {
      const scenarioData = {
        title: `AI Scenario: ${scenarioContext.slice(0, 30)}${scenarioContext.length > 30 ? '...' : ''}`,
        audio_url: "ai://gen",
        language: "any",
        duration: 0,
        transcription: scenarioContext,
        status: 'new',
        metadata: {
          input_method: "ai",
          target_language: targetLanguage,
          source_tab: "ai-scenario",
        }
      }

      const scenario: any = await createScenario(scenarioData)
      await finalizeProcessing(scenario, scenarioContext, 'any', 'ai-scenario')
    } catch (error) {
      console.error('Error generating AI scenario:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate scenario items.",
        variant: "destructive",
      })
      setIsProcessing(false)
      setIsAnalyzing(false)
    }
  }

  const confirmVocabularyImport = async () => {
    setIsImporting(true)
    try {
      const itemsToImport = pendingVocabulary.filter((_, index) => checkedVocabularyIndices.has(index))
      
      if (itemsToImport.length > 0) {
        await createMultipleVocabulary(itemsToImport)
        setNewVocabularyAdded(itemsToImport)
        setPendingVocabulary([])
        toast({
          title: "Vocabulary Imported",
          description: `Successfully added ${itemsToImport.length} expressions to your vocabulary.`,
        })
      } else {
        setPendingVocabulary([])
        toast({
          title: "Import Skipped",
          description: "No vocabulary items were selected.",
        })
      }
    } catch (error) {
      console.error('Error importing vocabulary:', error)
      toast({
        title: "Error",
        description: "Failed to import vocabulary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const toggleVocabularyCheck = (index: number, checked: boolean) => {
    const nextSet = new Set(checkedVocabularyIndices)
    if (checked) {
      nextSet.add(index)
    } else {
      nextSet.delete(index)
    }
    setCheckedVocabularyIndices(nextSet)
  }

  const resetScenario = () => {
    setCompletedScenario(null)
    setNewVocabularyAdded([])
    setPendingVocabulary([])
    setCheckedVocabularyIndices(new Set())
    setRecordingTime(0)
    setPastedText("")
    setScenarioContext("")
  }

  const getLanguageName = (code: string) => {
    const mapping: Record<string, string> = {
      'en': 'English',
      'da': 'Danish',
      'hu': 'Hungarian',
      'de': 'German',
      'es': 'Spanish',
      'fr': 'French',
      'it': 'Italian'
    }
    if (code === 'any' || code === 'auto') return 'Detecting...'
    return mapping[code] || code.toUpperCase()
  }

  const renderResults = (scenario: ScenarioDetails) => {
    const isPastedText = scenario.audio_url === "text://pasted"
    const isAIScenario = scenario.audio_url === "ai://gen"
    
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{scenario.title}</h3>
            {isPastedText && <Badge variant="outline">Text Input</Badge>}
            {isAIScenario && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">AI Generated</Badge>}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {scenario.duration > 0 && (
              <div className="flex items-center gap-2">
                <span>Duration:</span>
                <Badge variant="secondary">
                  {formatTime(scenario.duration)}
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span>Language:</span>
              <Badge variant="secondary">
                {getLanguageName(scenario.language)}
              </Badge>
            </div>
          </div>
        </div>

        {!isPastedText && !isAIScenario && (
          <div className="flex flex-col items-center gap-4 w-full pt-2">
            <audio 
              controls 
              src={scenario.audio_url || undefined} 
              className="w-full max-w-md h-10 outline-hidden" 
            />
            <Button
              variant="outline"
              size="sm"
              onClick={resetScenario}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              New Audio Scenario
            </Button>
          </div>
        )}

        {(isPastedText || isAIScenario) && (
           <div className="flex justify-center pt-2">
             <Button
                variant="outline"
                size="sm"
                onClick={resetScenario}
                className="flex items-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Create New Scenario
              </Button>
           </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{isAIScenario ? "Scenario Context" : isPastedText ? "Input Text" : "Transcription"}</h3>
          <Card className="p-4 bg-muted/30">
            <p className="text-sm prose prose-sm max-w-none whitespace-pre-wrap">{scenario.transcription}</p>
          </Card>
        </div>
        
        {isAnalyzing && (
           <div className="flex flex-col items-center justify-center p-8 space-y-4">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="text-sm text-muted-foreground">Generating and extracting vocabulary...</p>
           </div>
        )}

        {!isAnalyzing && pendingVocabulary.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Review Generated Vocabulary ({checkedVocabularyIndices.size} / {pendingVocabulary.length} selected)</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingVocabulary.map((vocab, index) => (
                 <div key={index} className="flex gap-3 items-start border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                   <Checkbox 
                     checked={checkedVocabularyIndices.has(index)} 
                     onCheckedChange={(checked) => toggleVocabularyCheck(index, checked as boolean)} 
                     className="mt-1"
                   />
                   <div className="flex flex-col flex-1 min-w-0">
                     <div className="flex justify-between items-start mb-1 gap-2">
                       <span className="font-semibold text-sm truncate">{vocab.word}</span>
                       {vocab.metadata?.type && (
                         <Badge variant="outline" className="text-[10px] shrink-0">
                           {vocab.metadata.type}
                         </Badge>
                       )}
                     </div>
                     <span className="text-sm text-muted-foreground leading-tight">{vocab.translation}</span>
                     {vocab.context && (
                       <span className="text-xs text-muted-foreground opacity-80 mt-1 italic leading-tight">
                         {vocab.context}
                       </span>
                     )}
                   </div>
                 </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={confirmVocabularyImport} disabled={isImporting} className="w-full sm:w-auto">
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {checkedVocabularyIndices.size} Selected Items
              </Button>
            </div>
          </div>
        )}

        {!isAnalyzing && pendingVocabulary.length === 0 && newVocabularyAdded.length > 0 && (
          <div className="space-y-4 mt-6">
            <h3 className="text-sm font-medium">Imported Vocabulary</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {newVocabularyAdded.map((vocab, index) => (
                 <Card key={index} className="flex flex-col p-4 border-l-4 border-l-primary/30 opacity-70">
                   <div className="flex justify-between items-start mb-2">
                     <span className="font-semibold">{vocab.word}</span>
                     {vocab.metadata?.type && (
                       <Badge variant="outline" className="text-xs">
                         {vocab.metadata.type}
                       </Badge>
                     )}
                   </div>
                   <span className="text-sm text-muted-foreground mb-1">{vocab.translation}</span>
                   {vocab.context && (
                     <span className="text-xs text-muted-foreground opacity-80 mt-1 italic">
                       {vocab.context}
                     </span>
                   )}
                 </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Accordion type="single" value={accordionValue} onValueChange={setAccordionValue} className="space-y-4">
      <AccordionItem value="ai-scenario" className="border-none">
        <Card className="w-full overflow-hidden border-2 border-primary/10 shadow-lg">
          <AccordionTrigger className="hover:no-underline py-4 px-6 bg-primary/5">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">AI Scenario Generation</CardTitle>
                <CardDescription className="text-xs">Perfect for custom practice contexts</CardDescription>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-6 space-y-6">
               {completedScenario?.metadata?.source_tab === 'ai-scenario' ? (
                renderResults(completedScenario)
               ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="context" className="text-sm font-semibold">What situation do you want to practice?</Label>
                        <Textarea 
                            id="context"
                            placeholder="Example: Ordering a coffee in a busy cafe in Copenhagen..."
                            className="min-h-[100px] resize-none bg-muted/20 border-primary/5 focus:border-primary/20 transition-all"
                            value={scenarioContext}
                            onChange={(e) => setScenarioContext(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            The AI will generate 8-10 essential expressions for this specific context.
                        </p>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full gap-2 font-bold h-12 shadow-sm hover:shadow-md transition-all rounded-xl"
                        onClick={handleAIScenarioSubmit}
                        disabled={isProcessing || !scenarioContext.trim()}
                    >
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        Generate Scenario
                    </Button>
                </div>
               )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>

      <AccordionItem value="audio-scenario" className="border-none">
        <Card className="w-full overflow-hidden border border-primary/5">
          <AccordionTrigger className="hover:no-underline py-4 px-6 bg-muted/30">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-muted rounded-lg shrink-0">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Audio Scenario</CardTitle>
                <CardDescription className="text-xs">Record yourself or upload an audio file</CardDescription>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-6">
              {(completedScenario?.metadata?.source_tab === 'record-audio' || completedScenario?.metadata?.source_tab === 'upload-audio') ? (
                renderResults(completedScenario)
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col items-center space-y-6 py-4">
                    {isRecording && (
                      <div className="text-3xl font-mono text-primary animate-pulse tabular-nums">
                        {formatTime(recordingTime)}
                      </div>
                    )}
                    
                    <div className="relative">
                      <Button
                        size="lg"
                        variant={isRecording ? "destructive" : "default"}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing || isTranscribing || isAnalyzing || isUploading}
                        className={`w-28 h-28 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 ${isRecording ? 'animate-pulse' : ''}`}
                      >
                        {isRecording ? (
                          <Square className="h-8 w-8" />
                        ) : (isTranscribing || isAnalyzing || isUploading) ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="h-6 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {isRecording ? "Recording..." : isProcessing ? "Processing..." : isTranscribing ? "Transcribing..." : isAnalyzing ? "Analyzing..." : isUploading ? "Uploading..." : "Click to start recording"}
                      </div>

                      {!isRecording && !isProcessing && !isTranscribing && !isAnalyzing && !isUploading && (
                        <div className="flex flex-col items-center gap-2 pt-4 border-t w-full max-w-[200px]">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">OR</span>
                          <Input
                            type="file"
                            accept="audio/*,video/mp4,video/quicktime"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            disabled={isProcessing}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => fileInputRef.current?.click()} 
                            className="text-primary hover:text-primary/80 hover:bg-primary/5 font-semibold"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Audio File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>

      <AccordionItem value="upload-text" className="border-none">
        <Card className="w-full overflow-hidden border border-primary/5">
          <AccordionTrigger className="hover:no-underline py-4 px-6 bg-muted/30">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-muted rounded-lg shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Text Scenario</CardTitle>
                <CardDescription className="text-xs">Paste content to analyze</CardDescription>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-6 space-y-4">
              {completedScenario?.metadata?.source_tab === 'upload-text' ? (
                 renderResults(completedScenario)
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pasted-text" className="text-sm font-semibold">Content in Practiced Language</Label>
                    <Textarea 
                      id="pasted-text"
                      placeholder={`Paste a dialogue, article snippet, or any text in ${sourceLanguages.join(' or ').toUpperCase()}...`}
                      className="min-h-[150px] bg-muted/10"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Analysis will focus on {sourceLanguages.join(' & ')} expressions.
                    </p>
                  </div>
                  <Button 
                    className="w-full font-bold h-11"
                    onClick={handleTextSubmit}
                    disabled={isProcessing || !pastedText.trim()}
                  >
                    {isAnalyzing ? (
                       <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : (
                       <><BarChart2 className="mr-2 h-4 w-4" /> Analyze Text</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}