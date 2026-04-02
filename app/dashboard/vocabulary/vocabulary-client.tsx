"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search, Plus, Edit, Trash, Volume2, ArrowRight, Info } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getVocabulary, createVocabulary, updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary"
import { getRecordings } from "@/lib/actions/recordings"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface VocabularyItem {
  id: string
  user_id: string
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
  }
  return mapping[langCode] || langCode
}

const getLanguageName = (langCode: string): string => {
  const mapping: { [key: string]: string } = {
    'en': 'English',
    'da': 'Danish',
    'hu': 'Hungarian',
  }
  return mapping[langCode] || langCode.toUpperCase()
}

export default function VocabularyPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [recordings, setRecordings] = useState<{id: string, title: string}[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedRecordingId, setSelectedRecordingId] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null)
  const [isAddingPhrase, setIsAddingPhrase] = useState(false)
  const [newPhrase, setNewPhrase] = useState<Partial<VocabularyItem>>({
    word: '',
    translation: '',
    language: 'en',
    target_language: 'hu',
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
      const [vocabData, audioData] = await Promise.all([
        getVocabulary(),
        getRecordings()
      ])
      setVocabulary(vocabData as unknown as VocabularyItem[] || [])
      setRecordings(audioData as any || [])
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

  const playAudio = (text: string, language: string) => {
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
    
    // Check recording ID match
    const recId = item.metadata?.recording_id
    const matchesRecording = 
      selectedRecordingId === "all" || 
      (selectedRecordingId === "manual" && !recId) || 
      recId === selectedRecordingId

    return matchesSearch && matchesCategory && matchesRecording
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
        target_language: 'hu',
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
    <main className="flex-1 container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary</h1>
          <p className="text-muted-foreground">Manage your personalized vocabulary list.</p>
        </div>
        <Dialog open={isAddingPhrase} onOpenChange={setIsAddingPhrase}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Phrase
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
               <DialogTitle>Add New Phrase</DialogTitle>
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
                    target_language: 'hu',
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
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Vocabulary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search phrases or translations..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full sm:w-auto">
                    <TabsList className="w-full grid grid-cols-3 sm:flex sm:w-auto">
                      {categories.map((category) => (
                        <TabsTrigger key={category} value={category} className="capitalize">
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mb-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label htmlFor="recording-filter" className="text-sm text-muted-foreground whitespace-nowrap">Source:</Label>
                    <select
                      id="recording-filter"
                      className="flex h-9 w-full sm:w-[250px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      value={selectedRecordingId}
                      onChange={(e) => setSelectedRecordingId(e.target.value)}
                    >
                      <option value="all">All Items</option>
                      <option value="manual">Manually Added</option>
                      {recordings.map(rec => (
                        <option key={rec.id} value={rec.id}>{rec.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading vocabulary items...</p>
                </div>
              ) : filteredVocabulary.length > 0 ? (
                filteredVocabulary.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex items-center">
                      <div className="flex-1 p-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{item.word}</span>
                              <Image 
                                src={`https://flagcdn.com/16x12/${getFlagCode(item.language)}.png`}
                                alt={getLanguageName(item.language)}
                                width={16}
                                height={12}
                                className="h-3 w-4"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => playAudio(item.word, item.language)}
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{item.translation}</span>
                              <Image 
                                src={`https://flagcdn.com/16x12/${getFlagCode(item.target_language)}.png`}
                                alt={getLanguageName(item.target_language)}
                                width={16}
                                height={12}
                                className="h-3 w-4"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => playAudio(item.translation, item.target_language)}
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {(item.context || item.example_sentence) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[300px]">
                                  <div className="space-y-1">
                                    {item.context && <p>Context: {item.context}</p>}
                                    {item.example_sentence && <p>Example: {item.example_sentence}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center border-l h-full">
                        {item.metadata?.category && (
                          <Badge variant="outline" className="mx-2 h-6">
                            {item.metadata.category}
                          </Badge>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-none px-3"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Vocabulary Item</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="word">Original Text</Label>
                                <Input
                                  id="word"
                                  value={editingItem?.word || ''}
                                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, word: e.target.value } : null)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="translation">Translation</Label>
                                <Input
                                  id="translation"
                                  value={editingItem?.translation || ''}
                                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, translation: e.target.value } : null)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                  id="category"
                                  value={editingItem?.metadata?.category || ''}
                                  onChange={(e) => setEditingItem(prev => prev ? {
                                    ...prev,
                                    metadata: { ...prev.metadata, category: e.target.value }
                                  } : null)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="context">Context (max 128 characters)</Label>
                                <Textarea
                                  id="context"
                                  value={editingItem?.context || ''}
                                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, context: e.target.value.slice(0, 128) } : null)}
                                  maxLength={128}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsEditing(null)
                                  setEditingItem(null)
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleSaveEdit}>
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-none px-3 text-destructive"
                              disabled={isDeleting === item.id}
                              onClick={() => {
                                setItemToDelete(item.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Vocabulary Item</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p>Are you sure you want to delete this vocabulary item? This action cannot be undone.</p>
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setIsDeleteDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => itemToDelete && handleDelete(itemToDelete)}
                                  disabled={isDeleting === itemToDelete}
                                >
                                  {isDeleting === itemToDelete ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                      : "Record your speech to start building your vocabulary."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}