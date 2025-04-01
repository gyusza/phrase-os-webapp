import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  try {
    console.log("Creating Supabase client...")
    if (!supabaseClient) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Missing Supabase environment variables")
        throw new Error("Missing Supabase environment variables")
      }

      console.log("Initializing Supabase client with URL:", supabaseUrl)
      supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
      console.log("Supabase client created successfully")
    } else {
      console.log("Reusing existing Supabase client")
    }
    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
} 