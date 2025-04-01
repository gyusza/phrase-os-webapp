import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RecordInterface from "@/components/record/record-interface"

export default async function RecordPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user settings to determine source and target languages
  const { data: settings } = await supabase
    .from('user_settings')
    .select('source_languages, target_language')
    .eq('user_id', user.id)
    .single()

  // Default to English if no settings found
  const sourceLanguages = settings?.source_languages || ['en']
  const targetLanguage = settings?.target_language || 'en'

  return (
    <main className="flex-1 container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Recording</h1>
          <p className="text-muted-foreground">Record your speech in any of your source languages.</p>
        </div>
      </div>

      <div className="grid place-items-center">
        <div className="w-full max-w-2xl">
          <RecordInterface 
            sourceLanguages={sourceLanguages}
            targetLanguage={targetLanguage}
          />
        </div>
      </div>
    </main>
  )
}