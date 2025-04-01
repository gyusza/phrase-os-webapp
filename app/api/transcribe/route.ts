import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Map Whisper's language codes to our format
const languageCodeMap: Record<string, string> = {
  'english': 'en',
  'hungarian': 'hu',
  'danish': 'da',
  'german': 'de'
}

export async function POST(request: Request) {
  try {
    const { audioUrl } = await request.json()

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      )
    }

    // Download the audio file from Supabase Storage
    const supabase = createClient()
    const { data: audioData, error: downloadError } = await supabase
      .storage
      .from('audio')
      .download(audioUrl)

    if (downloadError) {
      console.error('Error downloading audio:', downloadError)
      return NextResponse.json(
        { error: "Failed to download audio file" },
        { status: 500 }
      )
    }

    // Convert the audio data to a buffer
    const audioBuffer = Buffer.from(await audioData.arrayBuffer())

    // Transcribe the audio using OpenAI Whisper with language detection
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      model: "whisper-1",
      // Don't specify language to let Whisper auto-detect
      response_format: "verbose_json"
    })

    // Map the detected language to our format
    const normalizedLanguage = languageCodeMap[transcription.language.toLowerCase()]
    if (!normalizedLanguage) {
      console.warn(`Unknown language code from Whisper: ${transcription.language}`)
    }

    return NextResponse.json({
      transcription: transcription.text,
      detectedLanguage: normalizedLanguage || transcription.language.toLowerCase()
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    )
  }
} 