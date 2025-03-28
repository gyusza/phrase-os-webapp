import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Mic, Clock, BarChart2 } from 'lucide-react'

// Mock data for recordings
const recordings = [
  { id: 1, title: "Morning Routine", duration: "2:45", date: "Today, 8:30 AM", phrases: 12 },
  { id: 2, title: "Coffee Shop Conversation", duration: "3:20", date: "Yesterday, 2:15 PM", phrases: 18 },
  { id: 3, title: "Work Meeting", duration: "5:10", date: "Mar 15, 10:00 AM", phrases: 24 },
  { id: 4, title: "Grocery Shopping", duration: "1:55", date: "Mar 12, 4:30 PM", phrases: 9 },
]

export default function RecentRecordings() {
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
                    <span>{recording.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart2 className="h-3 w-3" />
                    <span>{recording.phrases} phrases</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {recording.date}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}