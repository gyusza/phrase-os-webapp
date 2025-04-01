"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Mic, Clock, BarChart2, Pause } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Recording {
  id: string
  title: string
  audio_url: string
  duration: number
  created_at: string
  language: string
  transcription: string | null
  analyses?: { count: number }[]
}

export default function RecentRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchRecordings()
  }, [])

  const fetchRecordings = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          analyses:analyses(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) throw error

      setRecordings(data || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
      toast({
        title: "Error",
        description: "Failed to load recordings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  const playRecording = async (recording: Recording) => {
    try {
      if (!audioRefs.current[recording.id]) {
        // Get a fresh download URL for the audio file
        const storagePath = recording.audio_url
          .split('/audio/')[1]
          .replace(/\?.*$/, '')

        const { data, error } = await supabase.storage
          .from('audio')
          .createSignedUrl(storagePath, 3600)

        if (error || !data?.signedUrl) {
          throw new Error('Failed to get audio URL')
        }

        audioRefs.current[recording.id] = new Audio(data.signedUrl)
        audioRefs.current[recording.id].onended = () => setIsPlaying(null)
        audioRefs.current[recording.id].onerror = () => {
          toast({
            title: "Error",
            description: "Failed to play the recording. Please try again.",
            variant: "destructive",
          })
          setIsPlaying(null)
        }
      }

      if (isPlaying === recording.id) {
        audioRefs.current[recording.id].pause()
      } else {
        // Stop any currently playing audio
        if (isPlaying && audioRefs.current[isPlaying]) {
          audioRefs.current[isPlaying].pause()
        }
        await audioRefs.current[recording.id].play()
      }
      setIsPlaying(isPlaying === recording.id ? null : recording.id)
    } catch (error) {
      console.error('Error playing audio:', error)
      toast({
        title: "Error",
        description: "Failed to play the recording. Please try again.",
        variant: "destructive",
      })
      setIsPlaying(null)
    }
  }

  const handleAnalyze = (recording: Recording) => {
    router.push(`/dashboard/recordings/${recording.id}/analyze`)
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Loading recordings...
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No recordings found. Start by creating a new recording!
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {recordings.map((recording) => (
        <Card key={recording.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{recording.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(recording.duration)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart2 className="h-3 w-3" />
                    <span>{recording.language === 'en' ? 'English' : 
                           recording.language === 'hu' ? 'Hungarian' : 
                           recording.language === 'da' ? 'Danish' : 'German'}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    recording.analyses?.[0]?.count > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {recording.analyses?.[0]?.count > 0 ? 'Analyzed' : 'New'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(recording.created_at)}
                </div>
                {recording.transcription && (
                  <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {recording.transcription.length > 128 
                      ? `${recording.transcription.slice(0, 128)}...` 
                      : recording.transcription}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => playRecording(recording)}
                >
                  {isPlaying === recording.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleAnalyze(recording)}
                >
                  <BarChart2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}