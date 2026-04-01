"use server"

import { db } from "@/lib/db"
import { recordings, vocabulary } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function getDashboardStats() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const user_id = session.user.id

  const totalRecordings = await db
    .select({ count: sql<number>`count(*)` })
    .from(recordings)
    .where(eq(recordings.user_id, user_id))
    
  const totalVocabulary = await db
    .select({ count: sql<number>`count(*)` })
    .from(vocabulary)
    .where(eq(vocabulary.user_id, user_id))

  return {
    totalRecordings: totalRecordings[0]?.count || 0,
    totalVocabulary: totalVocabulary[0]?.count || 0,
  }
}
