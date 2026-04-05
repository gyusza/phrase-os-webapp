"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Flame, Brain, Trophy, Target } from 'lucide-react'
import type { SRSLevel } from "@/lib/srs"

interface ReviewStatsProps {
  streak: number
  levels: Record<SRSLevel, number>
  totalWords: number
  wordsMatured: number
  retentionRate: number
  reviewsThisWeek: number
}

const LEVEL_CONFIG: Record<SRSLevel, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  learning: { label: 'Learning', color: 'text-orange-600', bgColor: 'bg-orange-500' },
  young: { label: 'Young', color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
  mature: { label: 'Mature', color: 'text-primary', bgColor: 'bg-primary' },
}

export default function ReviewStats({ streak, levels, totalWords, wordsMatured, retentionRate, reviewsThisWeek }: ReviewStatsProps) {
  const maturedPercentage = totalWords > 0 ? Math.round((wordsMatured / totalWords) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
        <CardContent className="p-4 text-center">
          <Flame className={`h-6 w-6 mx-auto mb-2 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
          <div className="text-2xl font-black">{streak}</div>
          <div className="text-[10px] font-bold text-muted-foreground">Day Streak</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
        <CardContent className="p-4 text-center">
          <Target className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
          <div className="text-2xl font-black text-emerald-600">{retentionRate}%</div>
          <div className="text-[10px] font-bold text-muted-foreground">Retention (7d)</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-white border-primary/10">
        <CardContent className="p-4 text-center">
          <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-black text-primary">{wordsMatured}</div>
          <div className="text-[10px] font-bold text-muted-foreground">Words Mastered</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Brain className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <div className="text-2xl font-black">{reviewsThisWeek}</div>
          <div className="text-[10px] font-bold text-muted-foreground">Reviews (7d)</div>
        </CardContent>
      </Card>

      {/* SRS Level Distribution */}
      {totalWords > 0 && (
        <Card className="col-span-2 sm:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Vocabulary Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {(Object.keys(LEVEL_CONFIG) as SRSLevel[]).map(level => {
                const count = levels[level] || 0
                const pct = totalWords > 0 ? (count / totalWords) * 100 : 0
                if (pct === 0) return null
                return (
                  <div
                    key={level}
                    className={`${LEVEL_CONFIG[level].bgColor} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${LEVEL_CONFIG[level].label}: ${count}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold">
              {(Object.keys(LEVEL_CONFIG) as SRSLevel[]).map(level => (
                <span key={level} className={`flex items-center gap-1.5 ${LEVEL_CONFIG[level].color}`}>
                  <span className={`w-2 h-2 rounded-full ${LEVEL_CONFIG[level].bgColor}`} />
                  {LEVEL_CONFIG[level].label}: {levels[level] || 0}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
