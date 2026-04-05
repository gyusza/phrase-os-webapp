"use server"

import { db } from "@/lib/db"
import { scenarios, analyses } from "@/lib/db/schema"
import { eq, desc, sql, count } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"


export async function getScenarios(limit?: number) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  let query = db
    .select({
      id: scenarios.id,
      title: scenarios.title,
      audio_url: scenarios.audio_url,
      duration: scenarios.duration,
      created_at: scenarios.created_at,
      language: scenarios.language,
      transcription: scenarios.transcription,
      status: scenarios.status,
      has_analysis: count(analyses.id),
    })
    .from(scenarios)
    .leftJoin(analyses, eq(scenarios.id, analyses.scenario_id))
    .where(eq(scenarios.user_id, session.user.id))
    .groupBy(scenarios.id)
    .orderBy(desc(scenarios.created_at))

  if (limit) {
    query = query.limit(limit) as any
  }

  const results = await query
  return results.map(r => ({
    ...r,
    analyses: [{ count: r.has_analysis }]
  }))
}

export async function getScenario(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const result = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1)
  return result[0] || null
}

export async function createScenario(data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const id = crypto.randomUUID()
  const record = {
    id,
    user_id: session.user.id,
    title: data.title || `Scenario ${new Date().toLocaleString()}`,
    audio_url: data.audio_url || null,
    duration: data.duration || 0,
    transcription: data.transcription,
    language: data.language,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: data.metadata || {},
    status: data.status || 'new',
  }

  await db.insert(scenarios).values(record)
  revalidatePath('/dashboard/scenarios')
  return record
}

export async function updateScenarioTitle(id: string, title: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.update(scenarios).set({ title }).where(eq(scenarios.id, id))
  revalidatePath('/dashboard/scenarios')
}

export async function deleteScenario(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.delete(analyses).where(eq(analyses.scenario_id, id))
  await db.delete(scenarios).where(eq(scenarios.id, id))
  revalidatePath('/dashboard/scenarios')
}

export async function updateScenario(id: string, data: Partial<any>) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.update(scenarios).set({ 
    ...data,
    updated_at: new Date().toISOString() 
  }).where(eq(scenarios.id, id))
  revalidatePath('/dashboard/scenarios')
}
