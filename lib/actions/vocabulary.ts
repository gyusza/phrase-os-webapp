"use server"

import { db } from "@/lib/db"
import { vocabulary, scenarios } from "@/lib/db/schema"
import { eq, desc, inArray, and, or, isNull } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"


export async function getVocabulary(limit?: number) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  let query = db
    .select({
      id: vocabulary.id,
      user_id: vocabulary.user_id,
      scenario_id: vocabulary.scenario_id,
      word: vocabulary.word,
      translation: vocabulary.translation,
      language: vocabulary.language,
      context: vocabulary.context,
      example_sentence: vocabulary.example_sentence,
      difficulty_level: vocabulary.difficulty_level,
      last_reviewed: vocabulary.last_reviewed,
      next_review: vocabulary.next_review,
      created_at: vocabulary.created_at,
      updated_at: vocabulary.updated_at,
      metadata: vocabulary.metadata,
      target_language: vocabulary.target_language,
      scenario_title: scenarios.title,
    })
    .from(vocabulary)
    .leftJoin(scenarios, eq(vocabulary.scenario_id, scenarios.id))
    .where(eq(vocabulary.user_id, session.user.id))
    .orderBy(desc(vocabulary.created_at))
  
  if (limit) {
    query = query.limit(limit) as any
  }

  return await query
}

export async function getVocabularyByScenarios(scenarioIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  if (!scenarioIds || scenarioIds.length === 0) {
    return []
  }

  const hasManual = scenarioIds.includes('manual')
  const isAllExceptManual = scenarioIds.includes('all_except_manual')
  const actualScenarioIds = scenarioIds.filter(id => id !== 'manual' && id !== 'all_except_manual')

  const conditions = []
  conditions.push(eq(vocabulary.user_id, session.user.id))

  if (isAllExceptManual) {
    // Specifically exclude manual phrases (scenario_id is not null)
    const allScenarios = await db.select({id: scenarios.id}).from(scenarios).where(eq(scenarios.user_id, session.user.id))
    const ids = allScenarios.map(s => s.id)
    if (ids.length === 0) return []
    conditions.push(inArray(vocabulary.scenario_id, ids))
  } else if (actualScenarioIds.length > 0 && hasManual) {
    conditions.push(or(inArray(vocabulary.scenario_id, actualScenarioIds), isNull(vocabulary.scenario_id)))
  } else if (actualScenarioIds.length > 0) {
    conditions.push(inArray(vocabulary.scenario_id, actualScenarioIds))
  } else if (hasManual) {
    conditions.push(isNull(vocabulary.scenario_id))
  } else {
    return []
  }

  return await db
    .select({
      id: vocabulary.id,
      user_id: vocabulary.user_id,
      scenario_id: vocabulary.scenario_id,
      word: vocabulary.word,
      translation: vocabulary.translation,
      language: vocabulary.language,
      context: vocabulary.context,
      example_sentence: vocabulary.example_sentence,
      difficulty_level: vocabulary.difficulty_level,
      last_reviewed: vocabulary.last_reviewed,
      next_review: vocabulary.next_review,
      created_at: vocabulary.created_at,
      updated_at: vocabulary.updated_at,
      metadata: vocabulary.metadata,
      target_language: vocabulary.target_language,
      scenario_title: scenarios.title,
    })
    .from(vocabulary)
    .leftJoin(scenarios, eq(vocabulary.scenario_id, scenarios.id))
    .where(and(...conditions))
    .orderBy(desc(vocabulary.created_at))
}

export async function createVocabulary(data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const id = crypto.randomUUID()
  const record = {
    ...data,
    id,
    user_id: session.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  await db.insert(vocabulary).values(record)
  revalidatePath('/dashboard/vocabulary')
  return record
}

export async function updateVocabulary(id: string, data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.update(vocabulary)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(vocabulary.id, id))

  revalidatePath('/dashboard/vocabulary')
}

export async function createMultipleVocabulary(items: any[]) {
  console.log(`\n[Vocabulary Action] createMultipleVocabulary called with ${items.length} items`)
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const userId = session.user.id
  
  const records = items.map(data => ({
    ...data,
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  if (records.length > 0) {
    console.log(`[Vocabulary Action] Executing bulk db.insert for ${records.length} items...`)
    await db.insert(vocabulary).values(records)
    console.log(`[Vocabulary Action] Insert completed. Revalidating path /dashboard/vocabulary`)
    revalidatePath('/dashboard/vocabulary')
  } else {
    console.log(`[Vocabulary Action] Notice: records array was empty, skipping DB insert.`)
  }
}

export async function deleteVocabulary(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.delete(vocabulary).where(eq(vocabulary.id, id))
  revalidatePath('/dashboard/vocabulary')
}
