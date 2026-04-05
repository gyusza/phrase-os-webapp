import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, Clock, Sparkles } from 'lucide-react'
import ProgressStats from "@/components/progress-stats"
import { getDetailedProgressStats, getReviewStats, getVocabularyByCategory } from "@/lib/actions/practice"
import { getDashboardStats } from "@/lib/actions/dashboard"
import { getUserSettings } from "@/lib/actions/settings"
import { ExportButton } from "@/components/progress/export-button"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [detailedStats, reviewStats, dashboardStats, categories, settings] = await Promise.all([
    getDetailedProgressStats(),
    getReviewStats(),
    getDashboardStats(),
    getVocabularyByCategory(),
    getUserSettings(),
  ])

  if (!detailedStats || !reviewStats) {
    return <div>Error loading progress data.</div>
  }

  const totalGoal = settings?.total_vocabulary_goal || 150
  const vocabSize = dashboardStats.totalVocabulary
  const totalScenarios = dashboardStats.totalScenarios
  
  // Calculate milestones
  const milestones = [
    { title: "First Scenario", date: "Achievement", icon: Sparkles, completed: totalScenarios > 0 },
    { title: "10 Vocabulary Items", date: "Milestone", icon: BookOpen, completed: vocabSize >= 10 },
    { title: "Streak Active", date: "Current", icon: Calendar, completed: reviewStats.streak > 0 },
    { title: "50 Vocabulary Items", date: "Milestone", icon: BookOpen, completed: vocabSize >= 50 },
    { title: "Pro Learner", date: `${totalGoal} Items`, icon: TrophyIcon, completed: vocabSize >= totalGoal },
  ]

  return (
    <main className="flex-1 container py-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted-foreground">Track your language learning journey and achievements.</p>
        </div>
        <ExportButton />
      </div>

      <div className="grid gap-8">
        {/* Core Stats Component */}
        <ProgressStats data={detailedStats as any} streak={reviewStats.streak} />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Category Distribution</CardTitle>
              <CardDescription>Vocabulary grouped by Scenario sources</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground italic">
                  No data yet. Complete a scenario to see your distribution!
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.slice(0, 5).map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-bold truncate max-w-[200px]">{item.category}</span>
                        <span className="text-sm text-muted-foreground font-medium tabular-nums">{item.count} phrases</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden border">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${item.percentage}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Milestones */}
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Learning Milestones</CardTitle>
              <CardDescription>Your historical achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {milestones.map((milestone, index) => {
                  const Icon = milestone.icon
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 transition-colors ${
                          milestone.completed
                            ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "bg-muted/50 border-muted text-muted-foreground animate-pulse"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className={`font-bold ${milestone.completed ? "text-foreground" : "text-muted-foreground"}`}>
                          {milestone.title}
                        </div>
                        <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none mt-1">
                          {milestone.completed ? "Achieved" : "In Progress"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}