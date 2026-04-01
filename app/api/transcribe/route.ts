import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import fs from "fs/promises"
import path from "path"

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

// Map common language names or codes to our expected format
const languageCodeMap: Record<string, string> = {
  'english': 'en',
  'hungarian': 'hu',
  'danish': 'da',
  'german': 'de',
  'en': 'en',
  'hu': 'hu',
  'da': 'da',
  'de': 'de'
}

export async function POST(request: Request) {
  try {
    const { audioUrl, sourceLanguages } = await request.json()
    console.log(`\n[API Transcribe] Incoming request started for audioUrl: ${audioUrl}`)
    console.log(`[API Transcribe] User selected source languages: ${sourceLanguages?.join(', ') || 'None provided'}`)

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      )
    }

    // Read the file locally
    const filePath = path.join(process.cwd(), 'public', audioUrl.replace(/^\//, ''))
    console.log(`[API Transcribe] Attempting to read local file: ${filePath}`)
    const fileBuffer = await fs.readFile(filePath)
    console.log(`[API Transcribe] Successfully read file buffer. Size: ${fileBuffer.length} bytes`)

    // Transcribe the audio using Gemini with language detection
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `You are an audio transcription assistant.
First, detect the spoken language of the audio.
${sourceLanguages && sourceLanguages.length > 0 ? `If the detected language code is NOT one of these accepted source languages ( ${sourceLanguages.join(', ')} ), return exactly this strictly formatted JSON and nothing else:
{"error": "Not an accepted source language", "language": "detected 2-letter ISO symbol"}

If the detected language code IS one of the accepted source languages, ` : ''}transcribe the audio accurately in its original language. Return exactly this strictly formatted JSON:
{"transcription": "the transcribed text", "language": "detected 2-letter ISO symbol"}` },
            { 
              inlineData: { 
                data: fileBuffer.toString("base64"), 
                mimeType: "audio/webm" 
              } 
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    })

    console.log(`[API Transcribe] Gemini successfully finished transcribing limits!`)
    const responseText = response.text
    if (!responseText) {
      throw new Error("No response from Gemini")
    }

    const transcriptionData = JSON.parse(responseText.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim())

    if (transcriptionData.error) {
      return NextResponse.json(
        { error: `Detected language '${transcriptionData.language || 'unknown'}' is not one of your selected source languages: ${sourceLanguages?.join(', ')}` },
        { status: 400 }
      )
    }

    // Map the detected language to our format
    const normalizedLanguage = languageCodeMap[transcriptionData.language?.toLowerCase()]
    if (!normalizedLanguage) {
      console.warn(`Unknown language code from Gemini: ${transcriptionData.language}`)
    }

    console.log(`[API Transcribe] Final mapped language to output: '${normalizedLanguage || transcriptionData.language?.toLowerCase()}'. Length of transcription text: ${transcriptionData.transcription?.length || 0} characters.`)
    return NextResponse.json({
      transcription: transcriptionData.transcription || "",
      detectedLanguage: normalizedLanguage || transcriptionData.language?.toLowerCase()
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}