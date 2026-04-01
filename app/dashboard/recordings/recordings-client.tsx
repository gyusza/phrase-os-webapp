"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Search, Play, Trash, Clock, BarChart2, Pencil, Pause } from 'lucide-react'
import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from 'react'
import { getRecordings, deleteRecording, updateRecordingTitle } from "@/lib/actions/recordings"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"

interface Recording {
  id: string
  title: string
  audio_url: string
  duration: number
  created_at: string
  language: string
  transcription: string | null
  status: 'new' | 'analyzed' | string
  analyses?: { count: number }[]
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'analyzed'>('all')
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const { toast } = useToast()
  const router = useRouter()
  const ITEMS_PER_PAGE = 10

  const loadRecordings = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getRecordings()

      // Filter recordings based on status
      const filteredData = data?.filter((recording: any) => {
        const analysisCount = recording.analyses?.[0]?.count ?? 0;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'analyzed') return analysisCount > 0;
        if (statusFilter === 'new') return analysisCount === 0;
        return true;
      });

      setRecordings(filteredData || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, statusFilter])

  useEffect(() => {
    loadRecordings()
  }, [loadRecordings, currentPage, searchQuery, statusFilter])

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
        audioRefs.current[recording.id] = new Audio(recording.audio_url)
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

  const handleTitleEdit = async (recording: Recording) => {
    if (!newTitle.trim()) return

    try {
      await updateRecordingTitle(recording.id, newTitle.trim())

      setRecordings(recordings.map(r => 
        r.id === recording.id ? { ...r, title: newTitle.trim() } : r
      ))
      setEditingTitle(null)
      toast({
        title: "Success",
        description: "Recording title updated successfully.",
      })
    } catch (error) {
      console.error('Error updating title:', error)
      toast({
        title: "Error",
        description: "Failed to update title. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (recording: Recording) => {
    try {
      setIsDeleting(recording.id)
      await deleteRecording(recording.id)

      setRecordings(recordings.filter(r => r.id !== recording.id))
      toast({
        title: "Success",
        description: "Recording deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting recording:', error)
      toast({
        title: "Error",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleAnalyze = (recording: Recording) => {
    router.push(`/dashboard/recordings/${recording.id}/analyze`)
  }

  return (
    <main className="flex-1 container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recordings</h1>
          <p className="text-muted-foreground">Manage your speech recordings and extracted phrases.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/record" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            New Recording
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Recordings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search recordings..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <Tabs 
                defaultValue="all" 
                className="w-full sm:w-auto"
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as 'all' | 'new' | 'analyzed')
                  setCurrentPage(1)
                }}
              >
                <TabsList className="w-full grid grid-cols-3 sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="analyzed">Analyzed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading recordings...
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recordings found. Start by creating a new recording!
                </div>
              ) : (
                recordings.map((recording) => (
                  <Card key={recording.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Mic className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingTitle === recording.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleTitleEdit(recording)
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTitleEdit(recording)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingTitle(null)
                                  setNewTitle("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{recording.title}</h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingTitle(recording.id)
                                  setNewTitle(recording.title)
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                (recording.analyses?.[0]?.count ?? 0) > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(recording.analyses?.[0]?.count ?? 0) > 0 ? 'Analyzed' : 'New'}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(recording.created_at)}
                          </div>
                          {recording.transcription && (
                            <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {recording.transcription}
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                disabled={isDeleting === recording.id}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Recording</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>Are you sure you want to delete this recording? This action cannot be undone.</p>
                                <div className="flex justify-end gap-2">
                                  <DialogClose asChild>
                                    <Button variant="outline">
                                      Cancel
                                    </Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleDelete(recording)}
                                      disabled={isDeleting === recording.id}
                                    >
                                      {isDeleting === recording.id ? "Deleting..." : "Delete"}
                                    </Button>
                                  </DialogClose>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {!isLoading && recordings.length > 0 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}