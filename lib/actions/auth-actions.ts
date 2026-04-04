"use server"

import { db } from "@/lib/db"
import { signup_requests } from "@/lib/db/schema"
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

export async function updateSignupRequestStatus(id: string, status: string) {
  const session = await auth()
  if (!session?.user || session.user.id !== ADMIN_ID) {
    throw new Error("Unauthorized")
  }

  try {
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
