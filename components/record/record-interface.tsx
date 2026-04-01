"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Mic, Square, Loader2, Play, RefreshCcw, Pause, Upload, FileText } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { createRecording } from "@/lib/actions/recordings"
import { getAnalysisData, saveAnalysis } from "@/lib/actions/analyze"
import { createMultipleVocabulary } from "@/lib/actions/vocabulary"

interface RecordInterfaceProps {
  sourceLanguages: string[]
  targetLanguage: string
}

interface RecordingDetails {
  id: string
  title: string
  audio_url: string
  transcription: string
  duration: number
  language: string
  status: 'new' | 'analyzed' | string
}

export function RecordInterface({ sourceLanguages, targetLanguage }: RecordInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [completedRecording, setCompletedRecording] = useState<RecordingDetails | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newVocabularyAdded, setNewVocabularyAdded] = useState<any[]>([])
  
  const [pendingVocabulary, setPendingVocabulary] = useState<any[]>([])
  const [checkedVocabularyIndices, setCheckedVocabularyIndices] = useState<Set<number>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  
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
        // Use the actual mimeType recorded by the browser, not forced webm
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType })
        const recordedDuration = durationRef.current
        
        if (audioBlob.size === 0) {
          toast({
            title: "Recording Error",
            description: "No audio data was captured. Please check your microphone permissions.",
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

      mediaRecorder.start(250) // Force chunk emission every 250ms to prevent browser deadlocks
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

  const handleRecordingComplete = async (audioBlob: Blob, recordedDuration: number) => {
    console.log('Processing recording...')
    console.log('Final duration:', recordedDuration)
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
      
      const { url: publicUrl, filename } = await uploadRes.json()
      console.log('Audio file uploaded successfully to:', publicUrl)

      // 3. Transcribe the audio and enforce source languages
      console.log('Starting transcription...')
      setIsTranscribing(true)
      const { transcription, detectedLanguage } = await transcribeAudio(publicUrl, sourceLanguages)
      console.log('Transcription completed:', transcription)
      console.log('Detected language:', detectedLanguage)

      console.log('Creating database record...')
      const recordData = {
        title: `Recording ${new Date().toLocaleString()}`,
        audio_url: publicUrl,
        language: detectedLanguage,
        duration: recordedDuration,
        transcription,
        status: 'new',
        metadata: {
          source_languages: sourceLanguages,
          target_language: targetLanguage,
          recording_time: recordedDuration,
          detected_language: detectedLanguage
        }
      }

      const recording: any = await createRecording(recordData)

      setCompletedRecording(recording)
      toast({
        title: "Success",
        description: "Recording saved and transcribed successfully.",
      })

      // Automate Analysis and Translation
      setIsAnalyzing(true)
      try {
        console.log('Automated analysis started...')
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcription,
            language: detectedLanguage,
          }),
        })

        if (!analyzeResponse.ok) throw new Error('Failed to analyze recording')
        const analyzeData = await analyzeResponse.json()
        const analyzedItems = analyzeData.items

        // Save analysis to db silently
        await saveAnalysis(recording.id, analyzedItems)
        
        // Translate and add to vocabulary
        const dynamicAnalysisData: any = await getAnalysisData(recording.id)
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
              sourceLanguage: detectedLanguage,
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
              language: detectedLanguage,
              target_language: targetLanguage,
              context: translation.explanation || null,
              example_sentence: item.type === 'sentence' ? item.text : null,
              metadata: {
                type: item.type,
                recording_id: recording.id,
              }
            }
          })

          setPendingVocabulary(vocabularyItems)
          setCheckedVocabularyIndices(new Set(vocabularyItems.map((_, i) => i)))
          toast({
            title: "Analysis Ready",
            description: `Extracted ${vocabularyItems.length} new expressions for review.`,
          })
        } else {
          toast({
            title: "Analysis Complete",
            description: "No brand new vocabulary to add.",
          })
        }
      } catch (analyzeErr) {
        console.error('Error during automated analysis:', analyzeErr)
      } finally {
        setIsAnalyzing(false)
      }

    } catch (error) {
      console.error('Error processing recording:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setIsTranscribing(false)
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
          description: "No vocabulary items were selected for import.",
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

  const resetRecording = () => {
    setCompletedRecording(null)
    setNewVocabularyAdded([])
    setPendingVocabulary([])
    setCheckedVocabularyIndices(new Set())
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Accordion type="single" defaultValue="record-audio" className="space-y-6">
      <AccordionItem value="record-audio" className="border-none">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <AccordionTrigger className="pt-0">
              <CardTitle className="text-2xl">Record Audio</CardTitle>
            </AccordionTrigger>
            {!completedRecording && (
              <CardDescription>
                Record your speech in {sourceLanguages.map(lang => 
                  lang === 'en' ? 'English' : 
                  lang === 'hu' ? 'Hungarian' : 
                  lang === 'da' ? 'Danish' : 'German'
                ).join(' or ')}
              </CardDescription>
            )}
          </CardHeader>
          <AccordionContent>
            <CardContent>
              {!completedRecording ? (
                <div className="space-y-8">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Source Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {sourceLanguages.map((lang) => (
                          <Badge
                            key={lang}
                            variant="secondary"
                            className="text-sm"
                          >
                            {lang === 'en' ? 'English' : 
                             lang === 'hu' ? 'Hungarian' : 
                             lang === 'da' ? 'Danish' : 'German'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Target Language</h3>
                      <Badge
                        variant="secondary"
                        className="text-sm"
                      >
                        {targetLanguage === 'en' ? 'English' : 
                         targetLanguage === 'hu' ? 'Hungarian' : 
                         targetLanguage === 'da' ? 'Danish' : 'German'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-6">
                    {isRecording && (
                      <div className="text-xl font-mono text-primary">
                        {formatTime(recordingTime)}
                      </div>
                    )}
                    <Button
                      size="lg"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing || isTranscribing || isAnalyzing}
                      className="w-32 h-32 rounded-full relative"
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : (isTranscribing || isAnalyzing) ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                    
                    {isProcessing && !isTranscribing && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing recording...
                      </div>
                    )}

                    {isTranscribing && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Transcribing audio...
                      </div>
                    )}
                    
                    {isAnalyzing && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting and translating new vocabulary...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{completedRecording.title}</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Duration:</span>
                        <Badge variant="secondary">
                          {formatTime(completedRecording.duration)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Language:</span>
                        <Badge variant="secondary">
                          {completedRecording.language === 'en' ? 'English' :
                           completedRecording.language === 'hu' ? 'Hungarian' :
                           completedRecording.language === 'da' ? 'Danish' : 'German'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 w-full pt-2">
                    <audio 
                      controls 
                      src={completedRecording.audio_url} 
                      className="w-full max-w-md h-10 outline-none" 
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetRecording}
                      className="flex items-center gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Record Another Audio Segment
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Transcription</h3>
                    <Card className="p-4">
                      <p className="text-sm whitespace-pre-wrap">{completedRecording.transcription}</p>
                    </Card>
                  </div>
                  
                  {isAnalyzing && (
                     <div className="flex flex-col items-center justify-center p-8 space-y-4">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       <p className="text-sm text-muted-foreground">Extracting and learning new vocabulary...</p>
                     </div>
                  )}

                  {!isAnalyzing && pendingVocabulary.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Review New Vocabulary ({checkedVocabularyIndices.size} / {pendingVocabulary.length} selected)</h3>
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
              )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>

      <AccordionItem value="upload-audio" className="border-none">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <AccordionTrigger className="pt-0">
              <CardTitle className="text-2xl">Upload Audio</CardTitle>
            </AccordionTrigger>
            <CardDescription>
              Upload an audio file to transcribe and analyze
            </CardDescription>
          </CardHeader>
          <AccordionContent>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll soon be able to upload audio files directly for analysis
                  </p>
                </div>
                <Button disabled className="mt-2">
                  Upload Audio
                </Button>
              </div>
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>

      <AccordionItem value="upload-text" className="border-none">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <AccordionTrigger className="pt-0">
              <CardTitle className="text-2xl">Upload Text</CardTitle>
            </AccordionTrigger>
            <CardDescription>
              Upload or paste text for language analysis
            </CardDescription>
          </CardHeader>
          <AccordionContent>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-primary/10 p-6">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll soon be able to analyze text directly by uploading documents or pasting content
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supported formats will include: TXT, PDF, DOC, and more
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button disabled>
                    Upload Document
                  </Button>
                  <Button disabled variant="outline">
                    Paste Text
                  </Button>
                </div>
              </div>
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  )
}