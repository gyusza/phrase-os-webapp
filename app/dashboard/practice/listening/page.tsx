import { getVocabulary, getVocabularyByScenarios } from "@/lib/actions/vocabulary"
import ListeningClient from "@/components/practice/listening-client"
import { ChevronLeft, Filter } from 'lucide-react'
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function ListeningPage({
  searchParams,
}: {
  searchParams: Promise<{ scenarios?: string }>
}) {
  const { scenarios } = await searchParams
  const scenarioIds = scenarios?.split(",").filter(Boolean)
  const isFiltered = !!scenarioIds && scenarioIds.length > 0

  const vocabulary = isFiltered
    ? await getVocabularyByScenarios(scenarioIds!)
    : await getVocabularyByScenarios(['all_except_manual']) // Default to all scenarios, excluding manual

  return (
    <div className="flex-1 -mt-6 -mx-4 sm:-mx-6 sm:-mt-6 min-h-screen bg-primary/5 py-8 sm:py-12">
      <div className="max-w-4xl px-3 sm:px-6 mx-auto">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <Link href="/dashboard/practice" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-extrabold group transition-all">
                <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Practice
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-bold pt-2 drop-shadow-sm">Passive study tape</h1>
                {isFiltered && (
                  <Badge variant="outline" className="mt-2 bg-primary/5 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-3">
                    <Filter className="h-3 w-3" />
                    Filtered Session
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xl italic font-medium">
                Headphones on. Relax. Repeat after the prompt.
              </p>
            </div>
          </div>

          <ListeningClient initialVocabulary={vocabulary as any} />
        </div>
      </div>
    </div>
  )
}
