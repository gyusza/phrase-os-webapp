"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Mic, Square, Loader2, Play, RefreshCcw, Pause, Upload, FileText } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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
  status: 'new' | 'analyzed'
}

export default function RecordInterface({ sourceLanguages, targetLanguage }: RecordInterfaceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [finalDuration, setFinalDuration] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [completedRecording, setCompletedRecording] = useState<RecordingDetails | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

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

  const transcribeAudio = async (audioUrl: string) => {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl })
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
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
      // First get the user ID since we need it for the file path
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      console.log('Uploading audio file...')
      // 1. Upload audio file to Supabase Storage with user ID in path
      const fileName = `${user.id}/recordings/${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBlob)

      if (uploadError) throw uploadError
      console.log('Audio file uploaded successfully')

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(fileName)

      // 3. Transcribe the audio first to get the detected language
      console.log('Starting transcription...')
      setIsTranscribing(true)
      const { transcription, detectedLanguage } = await transcribeAudio(fileName)
      console.log('Transcription completed:', transcription)
      console.log('Detected language:', detectedLanguage)

      // Verify the detected language is one of the allowed source languages
      if (!sourceLanguages.includes(detectedLanguage)) {
        throw new Error(`Detected language ${detectedLanguage} is not one of the allowed source languages: ${sourceLanguages.join(', ')}`)
      }

      console.log('Creating database record...')
      // 4. Create recording record in database with detected language
      const { data: recording, error: dbError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
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
        })
        .select()
        .single()

      if (dbError) throw dbError
      console.log('Database record created successfully')

      setCompletedRecording(recording)
      toast({
        title: "Success",
        description: "Recording saved and transcribed successfully.",
      })
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
        // Get a fresh download URL for the audio file
        const supabase = createClient();
        
        // Extract the path from the public URL correctly
        // The URL format is like: https://xxx.supabase.co/storage/v1/object/public/audio/user-id/recordings/timestamp.webm
        const storagePath = completedRecording.audio_url
          .split('/audio/')[1] // Get everything after 'audio/'
          .replace(/\?.*$/, ''); // Remove any query parameters

        console.log('Requesting signed URL for path:', storagePath);
        
        const { data, error } = await supabase.storage
          .from('audio')
          .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (error || !data?.signedUrl) {
          console.error('Error creating signed URL:', error);
          throw new Error('Failed to get audio URL');
        }

        console.log('Got signed URL:', data.signedUrl);

        audioRef.current = new Audio(data.signedUrl);
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
                      disabled={isProcessing || isTranscribing}
                      className="w-32 h-32 rounded-full relative"
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : isTranscribing ? (
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