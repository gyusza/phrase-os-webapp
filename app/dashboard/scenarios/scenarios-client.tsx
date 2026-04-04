"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Search, Play, Trash, Clock, BarChart2, Pencil, Pause, FileText, Sparkles } from 'lucide-react'
import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from 'react'
import { getScenarios, deleteScenario, updateScenarioTitle } from "@/lib/actions/scenarios"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"

interface Scenario {
  id: string
  title: string
  audio_url: string | null
  duration: number
  created_at: string
  language: string
  transcription: string | null
  status: 'new' | 'analyzed' | string
  analyses?: { count: number }[]
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'analyzed'>('all')
  const { toast } = useToast()
  const router = useRouter()
  const ITEMS_PER_PAGE = 10

  const loadScenarios = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getScenarios()

      // Filter scenarios based on status
      const filteredData = data?.filter((scenario: any) => {
        const analysisCount = scenario.analyses?.[0]?.count ?? 0;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'analyzed') return analysisCount > 0;
        if (statusFilter === 'new') return analysisCount === 0;
        return true;
      });

      setScenarios(filteredData || [])
    } catch (error) {
      console.error('Error fetching scenarios:', error)
      toast({
        title: "Error",
        description: "Failed to load scenarios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, statusFilter])

  useEffect(() => {
    loadScenarios()
  }, [loadScenarios, currentPage, searchQuery, statusFilter])

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

  const handleTitleEdit = async (scenario: Scenario) => {
    if (!newTitle.trim()) return

    try {
      await updateScenarioTitle(scenario.id, newTitle.trim())

      setScenarios(scenarios.map(r => 
        r.id === scenario.id ? { ...r, title: newTitle.trim() } : r
      ))
      setEditingTitle(null)
      toast({
        title: "Success",
        description: "Scenario title updated successfully.",
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

  const handleDelete = async (scenario: Scenario) => {
    try {
      setIsDeleting(scenario.id)
      await deleteScenario(scenario.id)

      setScenarios(scenarios.filter(r => r.id !== scenario.id))
      toast({
        title: "Success",
        description: "Scenario deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting scenario:', error)
      toast({
        title: "Error",
        description: "Failed to delete scenario. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleAnalyze = (scenario: Scenario) => {
    router.push(`/dashboard/scenarios/${scenario.id}/analyze`)
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

  const getScenarioIcon = (scenario: Scenario) => {
    if (scenario.audio_url?.startsWith('text://')) {
        return <FileText className="h-6 w-6 text-primary" />
    }
    if (scenario.audio_url?.startsWith('ai://')) {
        return <Sparkles className="h-6 w-6 text-primary" />
    }
    return <Mic className="h-6 w-6 text-primary" />
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your learning scenarios and phrases.</p>
        </div>
        <Button asChild className="w-full sm:w-auto h-11 sm:h-10">
          <Link href="/dashboard/scenarios/create" className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4" />
            New Scenario
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground outline-hidden" />
                <Input 
                  type="search" 
                  placeholder="Search scenarios..." 
                  className="pl-9 h-11 sm:h-10 text-base sm:text-sm"
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
                  Loading scenarios...
                </div>
              ) : scenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scenarios found. Start by creating a new scenario!
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <Card key={scenario.id}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {getScenarioIcon(scenario)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingTitle === scenario.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-8"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleTitleEdit(scenario)
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-lg truncate">{scenario.title}</h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => {
                                  setEditingTitle(scenario.id)
                                  setNewTitle(scenario.title)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-sm text-muted-foreground mt-1">
                            {scenario.duration > 0 && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(scenario.duration)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                              <BarChart2 className="h-3 w-3" />
                              <span>{getLanguageName(scenario.language)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                (scenario.analyses?.[0]?.count ?? 0) > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(scenario.analyses?.[0]?.count ?? 0) > 0 ? 'Analyzed' : 'New'}
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            {formatDate(scenario.created_at)}
                          </div>
                          
                          {scenario.audio_url && !scenario.audio_url.startsWith("text://") && !scenario.audio_url.startsWith("ai://") && (
                            <div className="mt-3">
                               <audio controls preload="none" src={scenario.audio_url} className="h-9 w-full max-w-[280px] outline-hidden" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-10 w-10 sm:h-9 sm:w-9"
                            onClick={() => handleAnalyze(scenario)}
                          >
                            <BarChart2 className="h-5 w-5 sm:h-4 sm:w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-10 w-10 sm:h-9 sm:w-9 text-destructive hover:text-destructive/90"
                                disabled={isDeleting === scenario.id}
                              >
                                <Trash className="h-5 w-5 sm:h-4 sm:w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Scenario</DialogTitle>
                                <DialogDescription>This action cannot be undone.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>Are you sure you want to delete this scenario? This action cannot be undone.</p>
                                <div className="flex justify-end gap-2">
                                  <DialogClose asChild>
                                    <Button variant="outline">
                                      Cancel
                                    </Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleDelete(scenario)}
                                      disabled={isDeleting === scenario.id}
                                    >
                                      {isDeleting === scenario.id ? "Deleting..." : "Delete"}
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

            {!isLoading && scenarios.length > 0 && (
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
    </div>
  )
}