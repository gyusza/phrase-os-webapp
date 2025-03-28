"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mic, StopCircle, Play, Save, Trash, Loader2, Upload, FileText, Music } from 'lucide-react'
import DashboardHeader from "@/components/dashboard-header"
import { useToast } from "@/hooks/use-toast"

export default function RecordPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(60) // Default 60 seconds
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [transcriptText, setTranscriptText] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Create audio element for playback
    audioRef.current = new Audio()
    audioRef.current.onended = () => setIsPlaying(false)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(audioBlob)
        }

        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop())
      }

      setIsRecording(true)
      setRecordingTime(0)
      mediaRecorderRef.current.start()

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= recordingDuration) {
            stopRecording()
            return recordingDuration
          }
          return prev + 1
        })
      }, 1000)

      toast({
        title: "Recording started",
        description: `Recording for ${recordingDuration} seconds...`,
      })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      toast({
        title: "Recording stopped",
        description: `Recorded ${recordingTime} seconds of audio.`,
      })
    }
  }

  const playRecording = () => {
    if (audioRef.current && audioBlob) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFileName(file.name)
    
    // Create a URL for the uploaded audio file
    const audioURL = URL.createObjectURL(file)
    if (audioRef.current) {
      audioRef.current.src = audioURL
    }
    
    setAudioBlob(file)
    
    toast({
      title: "File uploaded",
      description: `${file.name} has been uploaded successfully.`,
    })
  }

  const triggerFileUpload = () => {
    if (audioFileInputRef.current) {
      audioFileInputRef.current.click()
    }
  }

  const analyzeRecording = () => {
    if (!audioBlob && !transcriptText) return
    
    setIsAnalyzing(true)
    
    // Simulate analysis with a timeout
    setTimeout(() => {
      setIsAnalyzing(false)
      toast({
        title: "Analysis complete",
        description: "Your recording has been analyzed and phrases have been extracted.",
      })
      // In a real app, you would send the audio to a server for analysis
      // and then redirect to a results page
    }, 3000)
  }

  const discardRecording = () => {
    setAudioBlob(null)
    setUploadedFileName(null)
    setTranscriptText("")
    if (audioRef.current) {
      audioRef.current.src = ""
    }
    toast({
      title: "Recording discarded",
      description: "Your recording has been discarded.",
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      
      <main className="flex-1 container py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-6">Record Your Speech</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>New Recording</CardTitle>
              <CardDescription>
                Record yourself speaking naturally or upload audio/text to analyze your most common phrases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="record" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="record" className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Record
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    Upload Audio
                  </TabsTrigger>
                  <TabsTrigger value="transcript" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text Transcript
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="record">
                  {!audioBlob ? (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Recording Duration</h3>
                        <div className="flex items-center gap-4">
                          <Slider 
                            value={[recordingDuration]} 
                            min={10} 
                            max={300} 
                            step={10}
                            onValueChange={(value) => setRecordingDuration(value[0])}
                            disabled={isRecording}
                            className="flex-1"
                          />
                          <span className="w-16 text-right">{formatTime(recordingDuration)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Target Language</h3>
                        <Select defaultValue="danish">
                          <SelectTrigger disabled={isRecording}>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="danish">Danish</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="german">German</SelectItem>
                            <SelectItem value="italian">Italian</SelectItem>
                            <SelectItem value="japanese">Japanese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex justify-center py-10">
                        {isRecording ? (
                          <div className="text-center">
                            <div className="w-32 h-32 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto relative">
                              <div className="w-24 h-24 rounded-full bg-red-200 flex items-center justify-center animate-pulse">
                                <Mic className="h-12 w-12 text-red-500" />
                              </div>
                              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-red-500">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                  <circle
                                    className="text-red-500 stroke-current"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r="48"
                                    cx="50"
                                    cy="50"
                                    style={{
                                      strokeDasharray: 301.59,
                                      strokeDashoffset: 301.59 - (301.59 * recordingTime) / recordingDuration,
                                      transformOrigin: 'center',
                                      transform: 'rotate(-90deg)',
                                    }}
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="text-2xl font-bold">{formatTime(recordingTime)}</div>
                            <p className="text-muted-foreground">Recording in progress...</p>
                          </div>
                        ) : (
                          <Button 
                            size="lg" 
                            className="w-32 h-32 rounded-full"
                            onClick={startRecording}
                          >
                            <Mic className="h-12 w-12" />
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-center py-6">
                        <div className="w-64 h-20 bg-muted rounded-lg flex items-center justify-center relative">
                          <div className="absolute inset-0 flex items-center px-4">
                            {Array.from({ length: 30 }).map((_, i) => (
                              <div 
                                key={i}
                                className="flex-1 bg-primary"
                                style={{ 
                                  height: `${Math.random() * 100}%`,
                                  marginLeft: '1px',
                                  marginRight: '1px',
                                  opacity: isPlaying ? 1 : 0.5
                                }}
                              />
                            ))}
                          </div>
                          <div className="z-10 bg-background/80 px-4 py-2 rounded-full">
                            {isPlaying ? (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={stopPlayback}
                              >
                                <StopCircle className="h-6 w-6" />
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={playRecording}
                              >
                                <Play className="h-6 w-6" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center gap-4">
                        <Button 
                          variant="outline" 
                          className="gap-2"
                          onClick={discardRecording}
                        >
                          <Trash className="h-4 w-4" />
                          Discard
                        </Button>
                        <Button 
                          className="gap-2"
                          onClick={analyzeRecording}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save & Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="upload">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Target Language</h3>
                      <Select defaultValue="danish">
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="danish">Danish</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="german">German</SelectItem>
                          <SelectItem value="italian">Italian</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".mp3,.wav"
                        className="hidden"
                        ref={audioFileInputRef}
                        onChange={handleFileUpload}
                      />
                      
                      {!uploadedFileName ? (
                        <div className="space-y-4">
                          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">Upload audio file</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Drag and drop or click to upload MP3 or WAV files
                            </p>
                          </div>
                          <Button onClick={triggerFileUpload}>
                            Select File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Music className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium">File uploaded</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {uploadedFileName}
                            </p>
                          </div>
                          <div className="flex justify-center gap-4">
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={discardRecording}
                            >
                              <Trash className="h-4 w-4" />
                              Discard
                            </Button>
                            <Button 
                              className="gap-2"
                              onClick={analyzeRecording}
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Analyze
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="transcript">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Target Language</h3>
                      <Select defaultValue="danish">
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="danish">Danish</SelectItem>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="german">German</SelectItem>
                          <SelectItem value="italian">Italian</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transcript">Paste your transcript</Label>
                      <Textarea 
                        id="transcript" 
                        placeholder="Enter or paste your text transcript here..."
                        className="min-h-[200px]"
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-4">
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => setTranscriptText("")}
                        disabled={!transcriptText}
                      >
                        <Trash className="h-4 w-4" />
                        Clear
                      </Button>
                      <Button 
                        className="gap-2"
                        onClick={analyzeRecording}
                        disabled={isAnalyzing || !transcriptText}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              {isRecording ? (
                <Button 
                  variant="destructive" 
                  onClick={stopRecording}
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop Recording
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}