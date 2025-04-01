"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Calendar, Clock, Download, Mic } from 'lucide-react'

type TimeRange = "week" | "month" | "year"

export default function ProgressPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week")

  return (
    <main className="flex-1 container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted-foreground">Track your language learning journey and achievements.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full md:w-auto">
            <TabsList className="w-full grid grid-cols-3 md:w-auto">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Recordings</CardTitle>
              <CardDescription>Audio samples collected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">12</div>
                <div className="text-sm text-green-500">+2 this week</div>
              </div>
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "40%" }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">40% increase from last {timeRange}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vocabulary Size</CardTitle>
              <CardDescription>Unique phrases learned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">87</div>
                <div className="text-sm text-green-500">+15 this week</div>
              </div>
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "65%" }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">65% to your goal of 150 phrases</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Learning Streak</CardTitle>
              <CardDescription>Consecutive days active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">5 days</div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                      i < 5 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {["M", "T", "W", "T", "F", "S", "S"][i]}
                  </div>
                ))}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Keep going! Your best streak was 12 days.</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Your language learning activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <div className="h-full flex items-end justify-between gap-2 pt-10">
                {timeRange === "week" && (
                  <>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                      <div key={day} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div
                            className="w-5 bg-primary/70 rounded-t-sm"
                            style={{ height: `${[30, 45, 80, 60, 90, 50, 70][i]}%` }}
                            title="Recordings"
                          />
                          <div
                            className="w-5 bg-primary rounded-t-sm"
                            style={{ height: `${[40, 60, 75, 50, 85, 45, 65][i]}%` }}
                            title="Phrases learned"
                          />
                        </div>
                        <div className="text-xs font-medium">{day}</div>
                      </div>
                    ))}
                  </>
                )}

                {timeRange === "month" && (
                  <>
                    {["Week 1", "Week 2", "Week 3", "Week 4"].map((week, i) => (
                      <div key={week} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-full flex items-end justify-center gap-2 h-full">
                          <div
                            className="w-8 bg-primary/70 rounded-t-sm"
                            style={{ height: `${[50, 65, 80, 70][i]}%` }}
                            title="Recordings"
                          />
                          <div
                            className="w-8 bg-primary rounded-t-sm"
                            style={{ height: `${[45, 70, 85, 60][i]}%` }}
                            title="Phrases learned"
                          />
                        </div>
                        <div className="text-xs font-medium">{week}</div>
                      </div>
                    ))}
                  </>
                )}

                {timeRange === "year" && (
                  <>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                      (month, i) => (
                        <div key={month} className="flex flex-col items-center gap-2 flex-1">
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            <div
                              className="w-3 bg-primary/70 rounded-t-sm"
                              style={{ height: `${[30, 40, 60, 50, 70, 65, 80, 75, 60, 50, 40, 30][i]}%` }}
                              title="Recordings"
                            />
                            <div
                              className="w-3 bg-primary rounded-t-sm"
                              style={{ height: `${[25, 35, 55, 45, 65, 60, 75, 70, 55, 45, 35, 25][i]}%` }}
                              title="Phrases learned"
                            />
                          </div>
                          <div className="text-xs font-medium">{month}</div>
                        </div>
                      ),
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/70 rounded-sm" />
                <span className="text-sm">Recordings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span className="text-sm">Phrases learned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Vocabulary by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { category: "Daily", count: 32, percentage: 37 },
                  { category: "Work", count: 18, percentage: 21 },
                  { category: "Shopping", count: 15, percentage: 17 },
                  { category: "Food", count: 12, percentage: 14 },
                  { category: "Travel", count: 10, percentage: 11 },
                ].map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className="text-sm text-muted-foreground">{item.count} phrases</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Milestones</CardTitle>
              <CardDescription>Your achievements and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "First Recording", date: "Mar 1, 2023", icon: Mic, completed: true },
                  { title: "10 Vocabulary Items", date: "Mar 5, 2023", icon: BookOpen, completed: true },
                  { title: "5-Day Streak", date: "Today", icon: Calendar, completed: true },
                  { title: "50 Vocabulary Items", date: "Mar 12, 2023", icon: BookOpen, completed: true },
                  { title: "1 Hour Total Recording", date: "Mar 15, 2023", icon: Clock, completed: true },
                  { title: "100 Vocabulary Items", date: "Not completed", icon: BookOpen, completed: false },
                  { title: "10-Day Streak", date: "Not completed", icon: Calendar, completed: false },
                ].map((milestone, index) => {
                  const Icon = milestone.icon
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          milestone.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{milestone.title}</div>
                        <div className="text-sm text-muted-foreground">{milestone.date}</div>
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