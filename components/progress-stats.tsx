"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"

export default function ProgressStats() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="grid gap-4">
      <Tabs defaultValue="week">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Learning Activity</h3>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="week" className="mt-2">
          <Card>
            <CardContent className="p-6">
              <div className="h-[200px] flex items-end justify-between gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div 
                      className="w-12 bg-primary rounded-t-md" 
                      style={{ 
                        height: `${[30, 45, 80, 60, 90, 50, 70][i]}%`,
                        opacity: [0.7, 0.8, 1, 0.9, 1, 0.8, 0.9][i]
                      }}
                    />
                    <div className="text-xs font-medium">{day}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="month" className="mt-2">
          <Card>
            <CardContent className="p-6">
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Monthly data visualization would appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="year" className="mt-2">
          <Card>
            <CardContent className="p-6">
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Yearly data visualization would appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vocabulary Growth</CardTitle>
            <CardDescription>Total phrases learned over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">87</div>
              <div className="text-sm text-green-500">+15 this week</div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: "65%" }} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              65% to your goal of 150 phrases
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Learning Streak</CardTitle>
            <CardDescription>Consecutive days of activity</CardDescription>
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
            <div className="mt-1 text-xs text-muted-foreground">
              Keep going! Your best streak was 12 days.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}