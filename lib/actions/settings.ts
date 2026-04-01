"use server"

import { db } from "@/lib/db"
import { userSettings, profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function getUserSettings() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const result = await db.select().from(userSettings).where(eq(userSettings.user_id, session.user.id)).limit(1)
  
  if (!result[0]) {
    // Return defaults if none exist
    return {
      user_id: session.user.id,
      daily_vocabulary_goal: 10,
      theme: 'light',
      source_languages: ['en'],
      target_language: 'da',
      notification_preferences: {}
    }
  }

  return result[0];
}

export async function updateUserSettings(data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // Ensure record exists
  const existing = await db.select().from(userSettings).where(eq(userSettings.user_id, session.user.id)).limit(1)
  
  if (existing[0]) {
    await db.update(userSettings)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(userSettings.user_id, session.user.id))
  } else {
    await db.insert(userSettings).values({
      ...data,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  revalidatePath('/dashboard/settings')
  return true;
}

export async function getUserProfile() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const result = await db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1)
  
  if (!result[0]) {
    // Make sure profile exists for mocked users
    const record = {
      id: session.user.id,
      email: session.user.email || 'guest@local',
      full_name: session.user.name || 'Guest User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.insert(profiles).values(record);
    return record;
  }
  
  return result[0];
}

export async function updateUserProfile(data: any) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  await db.update(profiles)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(profiles.id, session.user.id))

  revalidatePath('/dashboard/settings')
  return true;
}
