import { ScenarioCreationInterface } from "@/components/scenarios/scenario-interface"
import { getUserSettings } from "@/lib/actions/settings"

export default async function CreateScenarioPage() {
  const settingsData: any = await getUserSettings()
  
  // Get source languages array or fallback
  const sourceLanguages = Array.isArray(settingsData?.source_languages) 
    ? settingsData?.source_languages 
    : typeof settingsData?.source_languages === 'string'
      ? JSON.parse(settingsData?.source_languages)
      : ['en']

  const targetLanguage = settingsData?.target_language || 'da'
    
  return (
    <main className="flex-1 py-6">
      <div className="container max-w-4xl mx-auto px-4 md:px-6">
        <ScenarioCreationInterface sourceLanguages={sourceLanguages} targetLanguage={targetLanguage} />
      </div>
    </main>
  )
}