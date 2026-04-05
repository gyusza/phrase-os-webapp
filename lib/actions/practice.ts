"use server"

import { db } from "@/lib/db"
import { vocabulary, vocabularyReviews, scenarios } from "@/lib/db/schema"
import { eq, and, sql, desc, lte, or, isNull, gte } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { calculateNextReview, parseSRSState, type SRSRating, type SRSLevel } from "@/lib/srs"

// ─── SRS-Powered Review Queue ───────────────────────────────────────────

/**
 * Get vocabulary items due for review (SRS queue)
 * Priority: most overdue first, then items never reviewed
 */
export async function getDueReviewItems(limit: number = 20) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id
  const now = new Date().toISOString()

  const items = await db.select()
    .from(vocabulary)
    .where(and(
      eq(vocabulary.user_id, userId),
      or(
        lte(vocabulary.next_review, now),
        isNull(vocabulary.next_review)
      )
    ))
    .orderBy(
      sql`CASE WHEN ${vocabulary.next_review} IS NULL THEN 0 ELSE 1 END`,
      vocabulary.next_review
    )
    .limit(limit)

  return items
}

/**
 * Fast count of items due for review today
 */
export async function getDueReviewCount() {
  const session = await auth()
  if (!session?.user?.id) return 0
  const userId = session.user.id
  const now = new Date().toISOString()

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(vocabulary)
    .where(and(
      eq(vocabulary.user_id, userId),
      or(
        lte(vocabulary.next_review, now),
        isNull(vocabulary.next_review)
      )
    ))

  return result[0]?.count || 0
}

/**
 * Record a review result using SM-2 algorithm
 * Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 */
export async function recordSRSReviewResult(vocabularyId: string, rating: SRSRating) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id
  const now = new Date().toISOString()

  // 1. Get current SRS state
  const [item] = await db.select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, vocabularyId), eq(vocabulary.user_id, userId)))
    .limit(1)

  if (!item) throw new Error("Vocabulary item not found")

  // 2. Calculate next review via SM-2
  const currentState = parseSRSState(item)
  const result = calculateNextReview(currentState, rating)

  // 3. Record in reviews table
  await db.insert(vocabularyReviews).values({
    id: crypto.randomUUID(),
    user_id: userId,
    vocabulary_id: vocabularyId,
    review_date: now,
    success: rating >= 2,
    difficulty_rating: rating,
    created_at: now,
  })

  // 4. Update vocabulary with new SRS state
  await db.update(vocabulary)
    .set({
      ease_factor: result.easeFactor.toFixed(2),
      interval: result.interval,
      repetition_count: result.repetitionCount,
      srs_level: result.srsLevel,
      next_review: result.nextReview,
      last_reviewed: now,
      difficulty_level: rating,
      updated_at: now,
    })
    .where(and(eq(vocabulary.id, vocabularyId), eq(vocabulary.user_id, userId)))

  revalidatePath('/dashboard/practice')
  revalidatePath('/dashboard/vocabulary')
  revalidatePath('/dashboard')
}

/**
 * Get review statistics for current user
 */
export async function getReviewStats() {
  const session = await auth()
  if (!session?.user?.id) return null
  const userId = session.user.id

  // SRS level distribution
  const levelCounts = await db.select({
    level: vocabulary.srs_level,
    count: sql<number>`count(*)`,
  })
    .from(vocabulary)
    .where(eq(vocabulary.user_id, userId))
    .groupBy(vocabulary.srs_level)

  // Total reviews in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const recentReviews = await db.select({
    total: sql<number>`count(*)`,
    successful: sql<number>`sum(case when ${vocabularyReviews.success} = 1 then 1 else 0 end)`,
  })
    .from(vocabularyReviews)
    .where(and(
      eq(vocabularyReviews.user_id, userId),
      sql`${vocabularyReviews.review_date} >= ${sevenDaysAgo}`
    ))

  // Streak: count consecutive days with at least 1 review
  const reviewDays = await db.select({
    day: sql<string>`date(${vocabularyReviews.review_date})`,
  })
    .from(vocabularyReviews)
    .where(eq(vocabularyReviews.user_id, userId))
    .groupBy(sql`date(${vocabularyReviews.review_date})`)
    .orderBy(desc(sql`date(${vocabularyReviews.review_date})`))
    .limit(60) // Check up to 60 days back

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < reviewDays.length; i++) {
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)
    const expectedStr = expectedDate.toISOString().split('T')[0]

    if (reviewDays[i].day === expectedStr) {
      streak++
    } else {
      break
    }
  }

  // Build level distribution map
  const levels: Record<SRSLevel, number> = { new: 0, learning: 0, young: 0, mature: 0 }
  for (const row of levelCounts) {
    const level = (row.level || 'new') as SRSLevel
    if (level in levels) {
      levels[level] = row.count
    }
  }

  const total = recentReviews[0]?.total || 0
  const successful = recentReviews[0]?.successful || 0

  return {
    streak,
    levels,
    totalWords: Object.values(levels).reduce((a, b) => a + b, 0),
    wordsMatured: levels.mature,
    retentionRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    reviewsThisWeek: total,
    dueCount: 0, // Will be filled by caller
  }
}

/**
 * Detailed statistics for the Progress tab
 */
export async function getDetailedProgressStats() {
  const sessionAuth = await auth()
  if (!sessionAuth?.user?.id) return null
  const userId = sessionAuth.user.id

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString()

  // 1. Daily Activity (Last 7 days)
  const dailyActivity = await db.select({
    day: sql<string>`date(${vocabularyReviews.review_date})`,
    count: sql<number>`count(*)`,
  })
    .from(vocabularyReviews)
    .where(and(
      eq(vocabularyReviews.user_id, userId),
      gte(vocabularyReviews.review_date, sevenDaysAgoStr)
    ))
    .groupBy(sql`date(${vocabularyReviews.review_date})`)
    .orderBy(sql`date(${vocabularyReviews.review_date})`)

  // 2. Vocabulary Growth
  const [totalVocab] = await db.select({ count: sql<number>`count(*)` })
    .from(vocabulary)
    .where(eq(vocabulary.user_id, userId))
  
  const [newVocabThisWeek] = await db.select({ count: sql<number>`count(*)` })
    .from(vocabulary)
    .where(and(
      eq(vocabulary.user_id, userId),
      gte(vocabulary.created_at, sevenDaysAgoStr)
    ))

  // 3. Games Played (Sessions)
  // Logic: Group reviews that occurred within 30 minutes of each other
  const recentReviews = await db.select({
    id: vocabularyReviews.id,
    review_date: vocabularyReviews.review_date,
    success: vocabularyReviews.success,
    word: vocabulary.word,
    translation: vocabulary.translation,
  })
    .from(vocabularyReviews)
    .innerJoin(vocabulary, eq(vocabularyReviews.vocabulary_id, vocabulary.id))
    .where(eq(vocabularyReviews.user_id, userId))
    .orderBy(desc(vocabularyReviews.review_date))
    .limit(100) // Look at last 100 reviews to form sessions

  const sessions: any[] = []
  let currentSession: any = null
  const SESSION_GAP_MS = 30 * 60 * 1000 // 30 minutes

  recentReviews.forEach((review) => {
    const reviewTime = new Date(review.review_date).getTime()
    
    if (!currentSession || (currentSession.startTime - reviewTime) > SESSION_GAP_MS) {
      // New session
      currentSession = {
        id: crypto.randomUUID(),
        startTime: reviewTime,
        endTime: reviewTime,
        reviews: [review],
        count: 1,
        successCount: review.success ? 1 : 0,
      }
      sessions.push(currentSession)
    } else {
      // Continue session
      currentSession.reviews.push(review)
      currentSession.count++
      if (review.success) currentSession.successCount++
      currentSession.startTime = Math.min(currentSession.startTime, reviewTime)
      currentSession.endTime = Math.max(currentSession.endTime, reviewTime)
    }
  })

  // Format activity for chart (ensure all 7 days are present)
  const activityMap: Record<string, number> = {}
  dailyActivity.forEach(d => activityMap[d.day] = d.count)

  const formattedActivity = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      date: dateStr,
      count: activityMap[dateStr] || 0,
    }
  })

  return {
    dailyActivity: formattedActivity,
    totalVocab: totalVocab?.count || 0,
    newVocabThisWeek: newVocabThisWeek?.count || 0,
    sessions: sessions.slice(0, 5), // Only top 5 sessions
  }
}

/**
 * Get vocabulary counts grouped by scenario titles (as categories)
 */
export async function getVocabularyByCategory() {
  const session = await auth()
  if (!session?.user?.id) return []
  const userId = session.user.id

  const results = await db.select({
    category: scenarios.title,
    count: sql<number>`count(${vocabulary.id})`,
  })
    .from(vocabulary)
    .innerJoin(scenarios, eq(vocabulary.scenario_id, scenarios.id))
    .where(eq(vocabulary.user_id, userId))
    .groupBy(scenarios.title)

  const total = results.reduce((acc, curr) => acc + curr.count, 0)
  
  return results.map(r => ({
    category: r.category,
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count)
}

/**
 * Export all vocabulary and review history as a CSV string
 */
export async function exportProgressAsCSV() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated")
  const userId = session.user.id

  const vocabData = await db.select()
    .from(vocabulary)
    .where(eq(vocabulary.user_id, userId))

  if (vocabData.length === 0) return "No data to export"

  const headers = ["Word", "Translation", "Language", "Target Language", "SRS Level", "Last Reviewed", "Created At"]
  const rows = vocabData.map(v => [
    v.word,
    v.translation,
    v.language,
    v.target_language,
    v.srs_level,
    v.last_reviewed || "Never",
    v.created_at
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n")

  return csvContent
}

// ─── Legacy/Backward-Compatible Functions ───────────────────────────────

export async function getPracticeSessionItems(limit: number = 10) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const items = await db.select()
    .from(vocabulary)
    .where(eq(vocabulary.user_id, userId))
    .orderBy(desc(vocabulary.created_at))
    .limit(limit)

  return items
}

export async function recordReviewResult(vocabularyId: string, success: boolean, difficultyRating?: number) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const reviewId = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(vocabularyReviews).values({
    id: reviewId,
    user_id: userId,
    vocabulary_id: vocabularyId,
    review_date: now,
    success,
    difficulty_rating: difficultyRating,
    created_at: now
  })

  // Use SRS rating: success=Good(2), fail=Again(0)
  const rating: SRSRating = success ? 2 : 0
  const [item] = await db.select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, vocabularyId), eq(vocabulary.user_id, userId)))
    .limit(1)

  if (item) {
    const currentState = parseSRSState(item)
    const result = calculateNextReview(currentState, rating)

    await db.update(vocabulary)
      .set({
        last_reviewed: now,
        updated_at: now,
        next_review: result.nextReview,
        ease_factor: result.easeFactor.toFixed(2),
        interval: result.interval,
        repetition_count: result.repetitionCount,
        srs_level: result.srsLevel,
      })
      .where(and(eq(vocabulary.id, vocabularyId), eq(vocabulary.user_id, userId)))
  }

  revalidatePath('/dashboard/practice')
  revalidatePath('/dashboard/vocabulary')
}
