"use server"

import { db } from "@/lib/db"
import { scenarios, vocabulary } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export async function getDashboardStats() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")
  const user_id = session.user.id

  const [totalScenariosRes, totalVocabularyRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(scenarios).where(eq(scenarios.user_id, user_id)),
    db.select({ count: sql<number>`count(*)` }).from(vocabulary).where(eq(vocabulary.user_id, user_id)),
  ])

  return {
    totalScenarios: totalScenariosRes[0]?.count || 0,
    totalVocabulary: totalVocabularyRes[0]?.count || 0,
  }
}
