import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2 } from 'lucide-react'
import { Button } from "@/components/ui/button"

// Update the mock data to include Danish examples
const vocabularyItems = [
  { id: 1, phrase: "Jeg skal til butikken", translation: "I need to go to the store", category: "daily", frequency: 12 },
  { id: 2, phrase: "Hvad tid er mødet?", translation: "What time is the meeting?", category: "work", frequency: 8 },
  { id: 3, phrase: "Hvor meget koster det?", translation: "How much does this cost?", category: "shopping", frequency: 15 },
  { id: 4, phrase: "Jeg vil gerne have en kaffe, tak", translation: "I would like a coffee, please", category: "food", frequency: 10 },
]

export default function VocabularyList() {
  return (
    <div className="grid gap-4">
      {vocabularyItems.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium truncate">{item.phrase}</h3>
                  <Badge variant="outline" className="ml-2 capitalize shrink-0">
                    {item.category}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{item.translation}</p>
                <div className="text-xs text-muted-foreground mt-1">Used {item.frequency} times</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="icon" title="Listen to original">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Listen to translation">
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}