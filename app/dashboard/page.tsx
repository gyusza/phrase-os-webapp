import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, BookOpen, BarChart2 } from 'lucide-react'
import Link from "next/link"
import RecentRecordings from "@/components/recent-recordings"
import RecentVocabulary from "@/components/recent-vocabulary"
import ProgressStats from "@/components/progress-stats"
import { getDashboardStats } from "@/lib/actions/dashboard"

import { getRecordings } from "@/lib/actions/recordings"
import { getVocabulary } from "@/lib/actions/vocabulary"

export default async function DashboardPage() {
  const [stats, recordings, vocabularyItems] = await Promise.all([
    getDashboardStats(),
    getRecordings(3),
    getVocabulary(5)
  ]);
  const { totalRecordings, totalVocabulary } = stats;

  return (
    <main className="flex-1 py-6">
      <div className="container">
        <div className="content-wrapper">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Track your language learning progress and manage your vocabulary.</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/record" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                New Recording
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recordings</CardTitle>
                <Mic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRecordings}</div>
                <p className="text-xs text-muted-foreground">Keep it coming!</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vocabulary Items</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVocabulary}</div>
                <p className="text-xs text-muted-foreground">Keep learning!</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold opacity-50">5 days</div>
                <p className="text-xs text-muted-foreground opacity-50">Coming soon</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="recordings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recordings" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Recordings
              </TabsTrigger>
              <TabsTrigger value="vocabulary" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Vocabulary
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
                <BarChart2 className="h-4 w-4" />
                Progress (Coming Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recordings" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Recent Recordings</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/recordings">View All</Link>
                </Button>
              </div>
              <RecentRecordings initialRecordings={recordings} />
            </TabsContent>

            <TabsContent value="vocabulary" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Recent Vocabulary</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/vocabulary">View All</Link>
                </Button>
              </div>
              <RecentVocabulary initialVocabulary={vocabularyItems} />
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Learning Progress</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/progress">Detailed Stats</Link>
                </Button>
              </div>
              <ProgressStats />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}