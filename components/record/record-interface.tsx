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
  const [finalDuration, setFinalDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [completedRecording, setCompletedRecording] = useState<RecordingDetails | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newVocabularyAdded, setNewVocabularyAdded] = useState<any[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
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
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await handleRecordingComplete(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
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
      setFinalDuration(recordingTime)
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

  const handleRecordingComplete = async (audioBlob: Blob) => {
    console.log('Processing recording...')
    console.log('Final duration:', finalDuration)
    setIsProcessing(true)
    try {
      console.log('Uploading audio file locally...')
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      
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
        duration: finalDuration,
        transcription,
        status: 'new',
        metadata: {
          source_languages: sourceLanguages,
          target_language: targetLanguage,
          recording_time: finalDuration,
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

          await createMultipleVocabulary(vocabularyItems)
          setNewVocabularyAdded(vocabularyItems)
          toast({
            title: "Vocabulary Updated",
            description: `Automatically added ${vocabularyItems.length} new expressions.`,
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

  const playRecording = async () => {
    if (!completedRecording) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(completedRecording.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          toast({
            title: "Error",
            description: "Failed to play the recording. Please try again.",
            variant: "destructive",
          });
          setIsPlaying(false);
        };
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Error",
        description: "Failed to play the recording. Please try again.",
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }

  const resetRecording = () => {
    setCompletedRecording(null);
    setNewVocabularyAdded([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
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

                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={isPlaying ? stopPlayback : playRecording}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={resetRecording}
                    >
                      <RefreshCcw className="h-4 w-4" />
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

                  {!isAnalyzing && newVocabularyAdded.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-sm font-medium">New Vocabulary Acquired</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {newVocabularyAdded.map((vocab, index) => (
                           <Card key={index} className="flex flex-col p-4 border-l-4 border-l-primary">
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