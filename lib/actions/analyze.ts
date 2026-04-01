"use server"

import { db } from "@/lib/db"
import { recordings, analyses, userSettings, profiles, vocabulary } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function getAnalysisData(recordingId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const userId = session.user.id

  const recordingRes = await db.select().from(recordings).where(eq(recordings.id, recordingId)).limit(1)
  const recording = recordingRes[0]
  if (!recording || recording.user_id !== userId) throw new Error("Recording not found")

  const analysesRes = await db.select().from(analyses)
    .where(eq(analyses.recording_id, recordingId))
    .orderBy(desc(analyses.created_at))

  const settingsRes = await db.select().from(userSettings).where(eq(userSettings.user_id, userId)).limit(1)
  const profileRes = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  
  const vocabRes = await db.select({ word: vocabulary.word }).from(vocabulary)
    .where(eq(vocabulary.user_id, userId))
    // We can filter by language in JS if needed, but we'll fetch all user words for simplicity
  
  return {
    recording,
    analyses: analysesRes,
    settings: settingsRes[0] || null,
    profile: profileRes[0] || null,
    existingWords: vocabRes.map(v => v.word.toLowerCase())
  }
}

export async function saveAnalysis(recordingId: string, items: any[]) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const id = crypto.randomUUID()
  
  const record = {
    id,
    recording_id: recordingId,
    items,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  await db.insert(analyses).values(record)
  
  await db.update(recordings)
    .set({ status: 'analyzed' })
    .where(eq(recordings.id, recordingId))
    
  revalidatePath(`/dashboard/recordings/${recordingId}/analyze`)
  revalidatePath(`/dashboard/recordings`)
  return record
}
