"use server"

import { db } from "@/lib/db"
import { signup_requests, profiles, scenarios, vocabulary, vocabularyReviews } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

const ADMIN_ID = "69582ce4-c873-4a07-923b-16fc6dddf577"

export async function submitSignupRequest(email: string) {
  if (!email || !email.includes('@')) {
    return { error: "Invalid email address" }
  }

  try {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(signup_requests).values({
      id,
      email,
      status: 'pending',
      created_at: now,
    })

    return { success: true }
  } catch (error) {
    console.error("Error submitting signup request:", error)
    return { error: "Failed to submit request. Please try again." }
  }
}

export async function getSignupRequests() {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    return await db.select().from(signup_requests).orderBy(desc(signup_requests.created_at))
  } catch (error) {
    console.error("Error fetching signup requests:", error)
    return []
  }
}

export async function getAllProfiles() {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    return await db.select().from(profiles).orderBy(desc(profiles.created_at))
  } catch (error) {
    console.error("Error fetching profiles:", error)
    return []
  }
}

export async function clearUserScenarios(userId: string) {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    await db.delete(scenarios).where(eq(scenarios.user_id, userId))
    revalidatePath('/dashboard/admin/signups')
    return { success: true }
  } catch (error) {
    console.error("Error clearing scenarios:", error)
    return { error: "Failed to clear scenarios." }
  }
}

export async function clearUserVocabulary(userId: string) {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    // Also delete reviews first or CASCADE if supported (SQLite doesn't always have it enabled by default)
    await db.delete(vocabularyReviews).where(eq(vocabularyReviews.user_id, userId))
    await db.delete(vocabulary).where(eq(vocabulary.user_id, userId))
    revalidatePath('/dashboard/admin/signups')
    return { success: true }
  } catch (error) {
    console.error("Error clearing vocabulary:", error)
    return { error: "Failed to clear vocabulary." }
  }
}

export async function updateSignupRequestStatus(id: string, status: string) {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    // If status is approved, create a profile
    if (status === 'approved') {
      const request = await db.select().from(signup_requests).where(eq(signup_requests.id, id)).limit(1)
      if (request[0]) {
        const email = request[0].email
        const password = email.split('@')[0]
        const profileId = crypto.randomUUID()
        const now = new Date().toISOString()

        // Check if user already exists
        const existing = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1)
        if (!existing[0]) {
          await db.insert(profiles).values({
            id: profileId,
            email,
            password,
            full_name: email.split('@')[0], // Basic default name
            created_at: now,
            updated_at: now,
          })
        }
      }
    }

    await db.update(signup_requests)
      .set({ status })
      .where(eq(signup_requests.id, id))
    
    revalidatePath('/dashboard/admin/signups')
    return { success: true }
  } catch (error) {
    console.error("Error updating signup request:", error)
    return { error: "Failed to update request." }
  }
}

export async function deleteSignupRequest(id: string) {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
    await db.delete(signup_requests).where(eq(signup_requests.id, id))
    revalidatePath('/dashboard/admin/signups')
    return { success: true }
  } catch (error) {
    console.error("Error deleting signup request:", error)
    return { error: "Failed to delete request." }
  }
}
