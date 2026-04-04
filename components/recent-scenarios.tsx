"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Play, BarChart2, Clock, Sparkles, FileText } from 'lucide-react'
import Link from "next/link"

interface Scenario {
  id: string
  title: string
  duration: number
  created_at: string
  audio_url: string | null
}

interface RecentScenariosProps {
  initialScenarios: Scenario[]
}

export default function RecentScenarios({ initialScenarios }: RecentScenariosProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getScenarioIcon = (scenario: Scenario) => {
    if (scenario.audio_url?.startsWith('text://')) {
        return <FileText className="h-4 w-4 text-primary" />
    }
    if (scenario.audio_url?.startsWith('ai://')) {
        return <Sparkles className="h-4 w-4 text-primary" />
    }
    return <Mic className="h-4 w-4 text-primary" />
  }

  if (!initialScenarios || initialScenarios.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No scenarios yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first scenario to start extracting vocabulary.
          </p>
          <Button asChild>
            <Link href="/dashboard/scenarios/create">Get Started</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {initialScenarios.map((scenario) => (
        <Card key={scenario.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {getScenarioIcon(scenario)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {scenario.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{scenario.duration > 0 ? formatTime(scenario.duration) : "Text/AI"}</span>
                  </div>
                  <span>{formatDate(scenario.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/dashboard/scenarios/${scenario.id}/analyze`}>
                    <BarChart2 className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}