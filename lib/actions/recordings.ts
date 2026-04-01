"use server"

import { db } from "@/lib/db"
import { recordings, analyses } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"


export async function getRecordings(limit?: number) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  let query = db
    .select({
      id: recordings.id,
      title: recordings.title,
      audio_url: recordings.audio_url,
      duration: recordings.duration,
      created_at: recordings.created_at,
      language: recordings.language,
      transcription: recordings.transcription,
      status: recordings.status,
      has_analysis: sql<number>`(SELECT count(*) FROM ${analyses} WHERE ${analyses.recording_id} = ${recordings.id})`
    })
    .from(recordings)
    .where(eq(recordings.user_id, session.user.id))
    .orderBy(desc(recordings.created_at))

  if (limit) {
    query = query.limit(limit) as any
  }

  const results = await query
  return results.map(r => ({
    ...r,
    analyses: [{ count: r.has_analysis }]
  }))
}

export async function getRecording(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const result = await db.select().from(recordings).where(eq(recordings.id, id)).limit(1)
  return result[0] || null
}

export async function createRecording(data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const id = crypto.randomUUID()
  const record = {
    id,
    user_id: session.user.id,
    title: data.title || `Recording ${new Date().toLocaleString()}`,
    audio_url: data.audio_url,
    duration: data.duration,
    transcription: data.transcription,
    language: data.language,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: data.metadata || {},
    status: data.status || 'new',
  }

  await db.insert(recordings).values(record)
  revalidatePath('/dashboard/recordings')
  return record
}

export async function updateRecordingTitle(id: string, title: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.update(recordings).set({ title }).where(eq(recordings.id, id))
  revalidatePath('/dashboard/recordings')
}

export async function deleteRecording(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.delete(analyses).where(eq(analyses.recording_id, id))
  await db.delete(recordings).where(eq(recordings.id, id))
  revalidatePath('/dashboard/recordings')
}
