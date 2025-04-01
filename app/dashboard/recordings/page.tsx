import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Search, Play, Trash, Clock, BarChart2 } from 'lucide-react'
import Link from "next/link"

// Mock data for recordings
const recordings = [
  { id: 1, title: "Morning Routine", duration: "2:45", date: "Today, 8:30 AM", phrases: 12 },
  { id: 2, title: "Coffee Shop Conversation", duration: "3:20", date: "Yesterday, 2:15 PM", phrases: 18 },
  { id: 3, title: "Work Meeting", duration: "5:10", date: "Mar 15, 10:00 AM", phrases: 24 },
  { id: 4, title: "Grocery Shopping", duration: "1:55", date: "Mar 12, 4:30 PM", phrases: 9 },
  { id: 5, title: "Restaurant Order", duration: "2:30", date: "Mar 10, 7:45 PM", phrases: 15 },
  { id: 6, title: "Phone Call with Friend", duration: "4:15", date: "Mar 8, 6:20 PM", phrases: 22 },
  { id: 7, title: "Asking for Directions", duration: "1:40", date: "Mar 5, 3:10 PM", phrases: 8 },
  { id: 8, title: "Gym Conversation", duration: "2:05", date: "Mar 3, 5:30 PM", phrases: 11 },
]

export default function RecordingsPage() {
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
            <CardDescription>Browse and manage your recorded speech samples.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search recordings..." className="pl-8" />
              </div>
              <Tabs defaultValue="all" className="w-full sm:w-auto">
                <TabsList className="w-full grid grid-cols-3 sm:w-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="analyzed">Analyzed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
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
                        <div className="text-xs text-muted-foreground mt-1">{recording.date}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}