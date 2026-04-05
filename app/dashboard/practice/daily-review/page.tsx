import { getDueReviewItems, getDueReviewCount } from "@/lib/actions/practice"
import DailyReviewClient from "@/components/practice/daily-review-client"
import { ChevronLeft, Zap } from 'lucide-react'
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function DailyReviewPage() {
  const [items, dueCount] = await Promise.all([
    getDueReviewItems(20),
    getDueReviewCount(),
  ])

  return (
    <div className="flex-1 -mt-8 sm:-mt-6 -mx-4 sm:-mx-6 min-h-screen bg-muted/10 py-6 sm:py-12">
      <div className="max-w-4xl px-3 sm:px-6 mx-auto">
        <div className="flex flex-col gap-6 sm:gap-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4 w-full">
              <Link href="/dashboard/practice" className="flex items-center gap-2 text-xs sm:text-sm text-primary hover:underline font-bold group transition-all">
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Practice
              </Link>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-3xl sm:text-4xl font-bold pt-1 italic text-primary">Daily Review</h1>
                  <Badge variant="outline" className="w-fit bg-primary/5 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-3 text-[10px] sm:text-xs">
                    <Zap className="h-3 w-3" />
                    {dueCount} words due
                  </Badge>
                </div>
                <p className="text-muted-foreground text-base sm:text-lg font-medium opacity-80 leading-snug">
                  Review your vocabulary with spaced repetition for maximum retention.
                </p>
              </div>
            </div>
          </div>

          <DailyReviewClient initialItems={items as any} totalDue={dueCount} />
        </div>
      </div>
    </div>
  )
}
