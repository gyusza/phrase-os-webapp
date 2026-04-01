"use server"

import { db } from "@/lib/db"
import { vocabulary } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"


export async function getVocabulary(limit?: number) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  let query = db.select().from(vocabulary).where(eq(vocabulary.user_id, session.user.id)).orderBy(desc(vocabulary.created_at))
  
  if (limit) {
    query = query.limit(limit) as any
  }

  return await query
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
