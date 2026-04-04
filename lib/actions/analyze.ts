"use server"

import { db } from "@/lib/db"
import { scenarios, analyses, userSettings, profiles, vocabulary } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function getAnalysisData(scenarioId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const scenarioRes = await db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).limit(1)
  const scenario = scenarioRes[0]
  if (!scenario || scenario.user_id !== userId) throw new Error("Scenario not found")

  const analysesRes = await db.select().from(analyses)
    .where(eq(analyses.scenario_id, scenarioId))
    .orderBy(desc(analyses.created_at))

  const settingsRes = await db.select().from(userSettings).where(eq(userSettings.user_id, userId)).limit(1)
  const profileRes = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  
  const vocabRes = await db.select({ word: vocabulary.word }).from(vocabulary)
    .where(eq(vocabulary.user_id, userId))
  
  return {
    scenario,
    analyses: analysesRes,
    settings: settingsRes[0] || null,
    profile: profileRes[0] || null,
    existingWords: vocabRes.map(v => v.word.toLowerCase())
  }
}

export async function saveAnalysis(scenarioId: string, items: any[]) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const id = crypto.randomUUID()
  
  const record = {
    id,
    scenario_id: scenarioId,
    items,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  await db.insert(analyses).values(record)
  
  await db.update(scenarios)
    .set({ status: 'analyzed' })
    .where(eq(scenarios.id, scenarioId))
    
  revalidatePath(`/dashboard/scenarios/${scenarioId}/analyze`)
  revalidatePath(`/dashboard/scenarios`)
  return record
}
