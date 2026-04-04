"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search, Plus, Pencil, Trash2, Volume2, ArrowRight, Info, Sparkles, AlertCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getVocabulary, createVocabulary, updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary"
import { getScenarios } from "@/lib/actions/scenarios"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface VocabularyItem {
  id: string
  user_id: string
  scenario_id: string | null
  scenario_title: string | null
  word: string
  translation: string
  language: string
  target_language: string
  context: string | null
  example_sentence: string | null
  metadata: {
    frequency?: number
    category?: string
    source?: string
  } | any
  created_at: string
  updated_at: string
}

const getFlagCode = (langCode: string): string => {
  const mapping: { [key: string]: string } = {
    'en': 'gb',
    'da': 'dk',
    'hu': 'hu',
    'de': 'de'
  }
  return mapping[langCode] || langCode
}

const getLanguageName = (langCode: string): string => {
  const mapping: { [key: string]: string } = {
    'en': 'English',
    'da': 'Danish',
    'hu': 'Hungarian',
    'de': 'German'
  }
  return mapping[langCode] || langCode.toUpperCase()
}

export default function VocabularyPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [scenarios, setScenarios] = useState<{id: string, title: string}[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedScenarioId, setSelectedScenarioId] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null)
  const [isAddingPhrase, setIsAddingPhrase] = useState(false)
  const [newPhrase, setNewPhrase] = useState<Partial<VocabularyItem>>({
    word: '',
    translation: '',
    language: 'en',
    target_language: 'da',
    context: '',
    example_sentence: '',
    metadata: {
      category: '',
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const loadVocabulary = useCallback(async () => {
    try {
      setIsLoading(true)
      const [vocabData, scenarioData] = await Promise.all([
        getVocabulary(),
        getScenarios()
      ])
      setVocabulary(vocabData as unknown as VocabularyItem[] || [])
      setScenarios(scenarioData as any || [])
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      toast({
        title: "Error",
        description: "Failed to load vocabulary items",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadVocabulary()
  }, [loadVocabulary])

  const handleEdit = (item: VocabularyItem) => {
    setEditingItem(item)
    setIsEditing(item.id)
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    try {
      await updateVocabulary(editingItem.id, {
          word: editingItem.word,
          translation: editingItem.translation,
          context: editingItem.context,
          example_sentence: editingItem.example_sentence,
          metadata: {
            ...editingItem.metadata,
            category: editingItem.metadata?.category || "uncategorized"
          }
      })

      setVocabulary(vocabulary.map(item => 
        item.id === editingItem.id ? editingItem : item
      ))

      setIsEditing(null)
      setEditingItem(null)
      toast({
        title: "Success",
        description: "Vocabulary item updated successfully.",
      })
    } catch (error) {
      console.error('Error updating vocabulary item:', error)
      toast({
        title: "Error",
        description: "Failed to update vocabulary item",
        variant: "destructive",
      })
    }
  }

  const playAudio = async (text: string, language: string, isTarget: boolean = true) => {
    if (isTarget) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language })
        })
        const data = await response.json()
        if (data.audio) {
          const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`)
          audio.play()
          return
        }
      } catch (error) {
        console.error('Gemini TTS failed, falling back to browser TTS:', error)
      }
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.8
    const voices = window.speechSynthesis.getVoices()
    const languageVoices = voices.filter(voice => voice.lang.startsWith(language))
    const preferredVoice = languageVoices.find(voice => !voice.localService) || languageVoices[0]
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    
    try {
      utterance.lang = language
    } catch (error) {
      console.warn('Could not set language for TTS:', error)
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const filteredVocabulary = vocabulary.filter((item) => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "all" || item.metadata?.category === activeCategory
    
    // Check scenario ID match
    const matchesScenario = 
      selectedScenarioId === "all" || 
      (selectedScenarioId === "manual" && !item.scenario_id) || 
      item.scenario_id === selectedScenarioId

    return matchesSearch && matchesCategory && matchesScenario
  })

  const uniqueCategories = Array.from(new Set(vocabulary.map((item) => item.metadata?.category || 'uncategorized')))
  const categories = ["all", ...uniqueCategories]

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      await deleteVocabulary(id)

      setVocabulary(vocabulary.filter(item => item.id !== id))
      setIsDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "Vocabulary item has been removed.",
      })
    } catch (error) {
      console.error('Error deleting vocabulary item:', error)
      toast({
        title: "Error",
        description: "Failed to delete vocabulary item",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
      setItemToDelete(null)
    }
  }

  const handleAddPhrase = async () => {
    try {
      setIsSubmitting(true)
      
      if (!newPhrase.word || !newPhrase.translation || !newPhrase.language || !newPhrase.target_language) {
        throw new Error('Please fill in all required fields')
      }

      const itemData = {
        word: newPhrase.word,
        translation: newPhrase.translation,
        language: newPhrase.language,
        target_language: newPhrase.target_language,
        context: newPhrase.context || null,
        example_sentence: newPhrase.example_sentence || null,
        metadata: {
          category: newPhrase.metadata?.category || 'uncategorized',
        }
      }

      const record: any = await createVocabulary(itemData)
      setVocabulary([record, ...vocabulary])
      setIsAddingPhrase(false)
      setNewPhrase({
        word: '',
        translation: '',
        language: 'en',
        target_language: 'da',
        context: '',
        example_sentence: '',
        metadata: {
          category: '',
        }
      })

      toast({
        title: "Success",
        description: "New phrase added to vocabulary.",
      })
    } catch (error) {
      console.error('Error adding vocabulary item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add vocabulary item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4">
        <Dialog open={isAddingPhrase} onOpenChange={setIsAddingPhrase}>
          <DialogContent>
            <DialogHeader>
               <DialogTitle>Add New Phrase</DialogTitle>
               <DialogDescription>Add a new word or expression to your vocabulary.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="word">Original Text <span className="text-destructive">*</span></Label>
                <Input
                  id="word"
                  value={newPhrase.word}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, word: e.target.value }))}
                  placeholder="Enter the original text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="translation">Translation <span className="text-destructive">*</span></Label>
                <Input
                  id="translation"
                  value={newPhrase.translation}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, translation: e.target.value }))}
                  placeholder="Enter the translation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Source Language <span className="text-destructive">*</span></Label>
                  <select
                    id="language"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newPhrase.language}
                    onChange={(e) => setNewPhrase(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="da">Danish</option>
                    <option value="hu">Hungarian</option>
                    <option value="de">German</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_language">Target Language <span className="text-destructive">*</span></Label>
                  <select
                    id="target_language"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newPhrase.target_language}
                    onChange={(e) => setNewPhrase(prev => ({ ...prev, target_language: e.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="da">Danish</option>
                    <option value="hu">Hungarian</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newPhrase.metadata?.category}
                  onChange={(e) => setNewPhrase(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, category: e.target.value }
                  }))}
                  placeholder="Enter a category (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="context">Context (max 128 characters)</Label>
                <Textarea
                  id="context"
                  value={newPhrase.context || ''}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, context: e.target.value.slice(0, 128) }))}
                  placeholder="Add context for this phrase (optional)"
                  maxLength={128}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="example">Example Sentence</Label>
                <Textarea
                  id="example"
                  value={newPhrase.example_sentence || ''}
                  onChange={(e) => setNewPhrase(prev => ({ ...prev, example_sentence: e.target.value }))}
                  placeholder="Add an example sentence (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingPhrase(false)
                  setNewPhrase({
                    word: '',
                    translation: '',
                    language: 'en',
                    target_language: 'da',
                    context: '',
                    example_sentence: '',
                    metadata: {
                      category: '',
                    }
                  })
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddPhrase}
                disabled={isSubmitting || !newPhrase.word || !newPhrase.translation}
              >
                {isSubmitting ? "Adding..." : "Add Phrase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vocabulary</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your personalized vocabulary list.</p>
        </div>
        <Button onClick={() => setIsAddingPhrase(true)} className="w-full sm:w-auto h-11 sm:h-10 gap-2 font-bold">
          <Plus className="h-4 w-4" />
          Add Phrase
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border-2 border-primary/5 shadow-sm">
          <CardHeader className="pb-3 px-4 pt-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Your Vocabulary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-6">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground outline-hidden" />
                <Input
                  type="search"
                  placeholder="Search phrases or translations..."
                  className="pl-9 h-11 sm:h-10 text-base sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full sm:w-auto">
                  <TabsList className="w-full grid grid-cols-3 sm:flex sm:w-auto h-10 sm:h-9">
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category} className="text-xs sm:text-sm capitalize font-bold">
                        {category === 'all' ? 'All' : category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    id="scenario-filter"
                    className="flex h-10 sm:h-9 w-full sm:w-[200px] rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring font-medium"
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                  >
                    <option value="all">All Scenarios</option>
                    <option value="manual">Manually Added</option>
                    {scenarios.map(scen => (
                      <option key={scen.id} value={scen.id}>{scen.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading vocabulary items...</p>
                </div>
              ) : filteredVocabulary.length > 0 ? (
                filteredVocabulary.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-2 border-primary/5 hover:border-primary/20 transition-all bg-card/50">
                    <div className="flex flex-col p-3 sm:p-4 gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
                          {/* Source side */}
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base">{item.word}</span>
                            <Image 
                              src={`https://flagcdn.com/16x12/${getFlagCode(item.language)}.png`}
                              alt={getLanguageName(item.language)}
                              width={16}
                              height={12}
                              className="h-3 w-4 border shrink-0 opacity-80"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 hover:bg-primary/5"
                              onClick={() => playAudio(item.word, item.language, false)}
                            >
                              <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>

                          {/* Divider on desktop */}
                          <ArrowRight className="hidden sm:inline h-4 w-4 text-muted-foreground/50" />

                          {/* Target side */}
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base sm:text-base bg-primary/10 px-2 py-0.5 rounded border border-primary/20 text-primary">{item.translation}</span>
                            <Image 
                              src={`https://flagcdn.com/16x12/${getFlagCode(item.target_language)}.png`}
                              alt={getLanguageName(item.target_language)}
                              width={16}
                              height={12}
                              className="h-3 w-4 border shrink-0 opacity-80"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 hover:bg-primary/5"
                              onClick={() => playAudio(item.translation, item.target_language, true)}
                            >
                              <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Meta & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0 border-t sm:border-0 pt-2 sm:pt-0">
                          <div className="flex items-center gap-2">
                            {item.metadata.type && (
                              <Badge variant="outline" className="text-[10px] uppercase font-extrabold h-5 px-1.5 border-primary/20 text-primary/70">
                                {item.metadata.type}
                              </Badge>
                            )}
                            {item.scenario_id && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                                Scenario
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => {
                                setItemToDelete(item.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No vocabulary items found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Try a different search term or category."
                      : "Create a scenario to start building your vocabulary."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}