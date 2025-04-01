"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search, Plus, Edit, Trash, Volume2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

// Update the mock data to include Danish examples
const mockVocabulary = [
  { id: 1, phrase: "Jeg skal til butikken", translation: "I need to go to the store", frequency: 12, category: "daily", source: "Shopping conversation" },
  { id: 2, phrase: "Hvad tid er mødet?", translation: "What time is the meeting?", frequency: 8, category: "work", source: "Office recording" },
  { id: 3, phrase: "Hvor meget koster det?", translation: "How much does this cost?", frequency: 15, category: "shopping", source: "Market conversation" },
  { id: 4, phrase: "Jeg vil gerne have en kaffe, tak", translation: "I would like a coffee, please", frequency: 10, category: "food", source: "Cafe recording" },
  { id: 5, phrase: "Hvor er toilettet?", translation: "Where is the bathroom?", frequency: 7, category: "travel", source: "Restaurant recording" },
]

export default function VocabularyPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [vocabulary, setVocabulary] = useState(mockVocabulary)
  const [activeCategory, setActiveCategory] = useState("all")
  const { toast } = useToast()

  const filteredVocabulary = vocabulary.filter((item) => {
    const matchesSearch =
      item.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === "all" || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Convert Set to Array before spreading to avoid TypeScript error
  const uniqueCategories = Array.from(new Set(vocabulary.map((item) => item.category)))
  const categories = ["all", ...uniqueCategories]

  const playAudio = (text: string) => {
    // In a real app, this would use the Web Speech API or a TTS service
    toast({
      title: "Audio playback",
      description: `Playing audio for: "${text}"`,
    })
  }

  const deleteVocabularyItem = (id: number) => {
    setVocabulary(vocabulary.filter((item) => item.id !== id))
    toast({
      title: "Item deleted",
      description: "Vocabulary item has been removed.",
    })
  }

  return (
    <main className="flex-1 container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary</h1>
          <p className="text-muted-foreground">Manage your personalized vocabulary list.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Phrase
        </Button>
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

            <div className="space-y-4">
              {filteredVocabulary.length > 0 ? (
                filteredVocabulary.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="flex-1 p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="space-y-1">
                            <h3 className="font-medium">{item.phrase}</h3>
                            <p className="text-muted-foreground">{item.translation}</p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {item.category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Used {item.frequency} times • Source: {item.source}
                        </div>
                      </div>
                      <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l">
                        <Button
                          variant="ghost"
                          className="flex-1 rounded-none"
                          onClick={() => playAudio(item.phrase)}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="flex-1 rounded-none"
                          onClick={() => playAudio(item.translation)}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" className="flex-1 rounded-none">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="flex-1 rounded-none text-destructive"
                          onClick={() => deleteVocabularyItem(item.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
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