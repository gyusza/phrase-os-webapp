"use server"

import { db } from "@/lib/db"
import { vocabulary, vocabularyReviews } from "@/lib/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function getPracticeSessionItems(limit: number = 10) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  // Strategy: 
  // 1. Get words due for review
  // 2. Mix with some new words
  // For now, let's keep it simple: latest 10 words that haven't been reviewed much
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

  // 1. Insert into vocabularyReviews
  await db.insert(vocabularyReviews).values({
    id: reviewId,
    user_id: userId,
    vocabulary_id: vocabularyId,
    review_date: now,
    success,
    difficulty_rating: difficultyRating,
    created_at: now
  })

  // 2. Update vocabulary item stats (simple for now)
  // In a real app, you'd use SM-2 or similar algorithm
  await db.update(vocabulary)
    .set({
      last_reviewed: now,
      updated_at: now,
      // Just a placeholder: next review in 1 day if success, else immediate
      next_review: success 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : now
    })
    .where(and(eq(vocabulary.id, vocabularyId), eq(vocabulary.user_id, userId)))

  revalidatePath('/dashboard/practice')
  revalidatePath('/dashboard/vocabulary')
}
