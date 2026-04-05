"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, Trophy, Play, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'
import { motion } from "framer-motion"

interface ReviewSession {
  id: string
  startTime: number
  endTime: number
  count: number
  successCount: number
  reviews: any[]
}

interface ProgressStatsProps {
  data: {
    dailyActivity: { day: string; date: string; count: number }[]
    totalVocab: number
    newVocabThisWeek: number
    sessions: ReviewSession[]
  }
  streak: number
}

export default function ProgressStats({ data, streak }: ProgressStatsProps) {
  const { dailyActivity, totalVocab, newVocabThisWeek, sessions } = data
  const maxCount = Math.max(...dailyActivity.map(d => d.count), 5)
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTime = (ms: number) => {
    if (!mounted) return "" 
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ms))
  }

  const formatDate = (ms: number) => {
    if (!mounted) return "" 
    const d = new Date(ms)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    if (d.getTime() >= today.getTime()) return "Today"
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.getTime() >= yesterday.getTime()) return "Yesterday"
    
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  }

  return (
    <div className="grid gap-6">
      {/* Learning Activity Chart */}
      <Card className="overflow-hidden border-2 shadow-sm">
        <CardHeader className="pb-2 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Reviews performed over the last 7 days</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black tabular-nums">
              {dailyActivity.reduce((acc, curr) => acc + curr.count, 0)} Total Reviews
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[200px] flex items-end justify-between gap-1 sm:gap-4 pt-4">
            {dailyActivity.map((day, i) => {
              const height = (day.count / maxCount) * 100
              const isToday = i === 6
              return (
                <div key={day.date} className="flex flex-col items-center gap-3 flex-1">
                  <div className="relative w-full group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                      className={`w-full rounded-t-lg mx-auto max-w-[40px] transition-all duration-300 ${
                        isToday 
                          ? "bg-primary shadow-[0_-4px_12px_rgba(var(--primary),0.3)]" 
                          : "bg-primary/40 group-hover:bg-primary/60"
                      }`}
                    />
                    {day.count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap z-10">
                        {day.count} reviews
                      </div>
                    )}
                  </div>
                  <div className={`text-[10px] sm:text-xs font-bold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {day.day}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Vocabulary Growth */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-500" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black tabular-nums">{totalVocab}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total phrases</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-600 tabular-nums">+{newVocabThisWeek}</div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This week</div>
              </div>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalVocab / 150) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "circOut" }}
                className="bg-gradient-to-r from-primary/80 to-primary h-full rounded-full"
              />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground text-center">
              {totalVocab >= 150 ? "Goal reached! Sets yours higher?" : `${150 - totalVocab} phrases to go until your next milestone.`}
            </p>
          </CardContent>
        </Card>
        
        {/* Streak Statistics */}
        <Card className="border-2 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Flame className="w-16 h-16 rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Flame className={`h-4 w-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} aria-hidden="true" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-black">{streak} {streak === 1 ? 'day' : 'days'}</div>
              {streak > 0 && (
                <Badge className="bg-orange-100 text-orange-600 border-orange-200 font-black animate-pulse">
                  STREAKING!
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {dailyActivity.map((day, i) => (
                <div 
                  key={i} 
                  className={`h-10 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                    day.count > 0 
                      ? "bg-orange-50 border-orange-200 text-orange-600 scale-105 shadow-sm" 
                      : "bg-muted/30 border-transparent text-muted-foreground"
                  }`}
                >
                  <span className="text-[10px] font-black leading-none">{day.day[0]}</span>
                  {day.count > 0 && <Flame className="h-3 w-3 mt-0.5 fill-current" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Played (Individual Sessions) */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold italic text-primary flex items-center gap-3">
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          Games Played
        </h3>
        {sessions.length === 0 ? (
          <Card className="border-2 border-dashed p-8 text-center bg-muted/10">
            <p className="text-muted-foreground font-medium">No practice sessions found. Start learning to see your history!</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => {
              const accuracy = Math.round((session.successCount / session.count) * 100)
              return (
                <motion.div 
                  key={session.id}
                  whileHover={{ x: 4 }}
                  className="bg-white border-2 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Gamepad2Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base leading-none mb-1">
                        Review Session
                      </h4>
                      <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.startTime)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.startTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-8 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className={`text-lg font-black ${accuracy >= 80 ? "text-emerald-600" : accuracy >= 50 ? "text-orange-500" : "text-red-500"}`}>
                        {accuracy}%
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">Accuracy</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black tabular-nums">{session.count}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Words</div>
                    </div>
                    <div className="flex -space-x-1">
                      {session.reviews.slice(0, 3).map((r: any, idx: number) => (
                        <div key={idx} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${r.success ? "bg-emerald-500" : "bg-red-500"}`}>
                          {r.success ? <CheckCircle2 className="h-3 w-3 text-white" /> : <XCircle className="h-3 w-3 text-white" />}
                        </div>
                      ))}
                      {session.count > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-muted text-[8px] font-bold flex items-center justify-center">
                          +{session.count - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Gamepad2Icon({ className }: { className?: string }) {
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
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  )
}