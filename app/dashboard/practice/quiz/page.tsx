import { getVocabulary, getVocabularyByScenarios } from "@/lib/actions/vocabulary"
import QuizClient from "@/components/practice/quiz-client"
import { ChevronLeft, Gamepad2 } from 'lucide-react'
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ scenarios?: string; type?: string }>
}) {
  const { scenarios, type } = await searchParams
  const scenarioIds = scenarios?.split(",").filter(Boolean)
  const isFiltered = !!scenarioIds && scenarioIds.length > 0

  const vocabulary = isFiltered
    ? await getVocabularyByScenarios(scenarioIds!)
    : await getVocabulary()

  const quizType = (type || 'mixed') as 'multiple-choice' | 'typing' | 'audio' | 'mixed'

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
                  <h1 className="text-3xl sm:text-4xl font-bold pt-1 italic text-primary">Quiz Challenge</h1>
                  <Badge variant="outline" className="w-fit bg-primary/5 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-3 text-[10px] sm:text-xs">
                    <Gamepad2 className="h-3 w-3" />
                    {quizType === 'mixed' ? 'Mixed Mode' : quizType.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-base sm:text-lg font-medium opacity-80 leading-snug">
                  Test your knowledge with active recall challenges.
                </p>
              </div>
            </div>
          </div>

          <QuizClient initialVocabulary={vocabulary as any} quizType={quizType} />
        </div>
      </div>
    </div>
  )
}
