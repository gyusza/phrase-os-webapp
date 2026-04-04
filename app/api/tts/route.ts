// [DEBUG TIMESTAMP: 1712248840] - v1.2
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tts_cache } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

const API_KEY = process.env.GEMINI_API_KEY
const VOICE_NAME = 'Puck'
const MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest'
]

/**
 * Convert raw PCM audio (L16, 24kHz, mono) to a WAV file by prepending a WAV header.
 */
function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64')
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const dataSize = pcmBuffer.length

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  const wavBuffer = Buffer.concat([header, pcmBuffer])
  return wavBuffer.toString('base64')
}

async function callGemini(text: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
  
  const body = {
    contents: [{
      role: "user",
      parts: [{ text: text }]
    }],
    generationConfig: {
      response_modalities: ["AUDIO"],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: VOICE_NAME
          }
        }
      }
    },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  return response
}

export async function POST(request: Request) {
  try {
    const { text, language } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // 1. Generate Cache ID
    const cacheId = crypto
      .createHash('sha256')
      .update(`${text}_${language}_${VOICE_NAME}`)
      .digest('hex')

    // 2. Check Cache
    try {
      const cached = await db.select().from(tts_cache).where(eq(tts_cache.id, cacheId)).get()
      if (cached) {
        console.log(`[API TTS v1.2] Cache HIT: "${text}"`)
        return NextResponse.json({
          audio: cached.audio_base64,
          mimeType: cached.mime_type,
          cached: true
        })
      }
    } catch (e) {}

    console.log(`[API TTS v1.2] Cache MISS: "${text}"`)

    let audioData: any = null
    let errorLog: string[] = []

    // Try each model
    for (const model of MODELS) {
      console.log(`[API TTS v1.2] Trying model: ${model}`)
      
      // For each model, try three prompt variations to bypass "OTHER"
      const variations = [
        text, // 1. Original
        text.replace(/[?!.]$/, ''), // 2. No punctuation
        `Speak the phrase: "${text}"` // 3. Explanatory wrapper
      ]

      for (const currentText of variations) {
        try {
          const response = await callGemini(currentText, model)
          
          if (!response.ok) {
            const status = response.status
            const err = await response.text()
            errorLog.push(`${model} [${currentText}]: ${status}`)
            // If 404/400, this model is fundamentally wrong, skip to next model
            if (status === 404 || status === 400) break
            continue
          }

          const data = await response.json()
          const parts = data.candidates?.[0]?.content?.parts
          if (parts && parts.length > 0) {
            const audioPart = parts.find((p: any) => p.inlineData?.data)
            if (audioPart) {
              audioData = audioPart.inlineData
              console.log(`[API TTS v1.2] SUCCESS with model=${model}, text="${currentText}"`)
              break
            }
          }
          
          const reason = data.candidates?.[0]?.finishReason
          errorLog.push(`${model} [${currentText}]: ${reason}`)
        } catch (err) {
          errorLog.push(`${model} [${currentText}]: Exception`)
        }
      }
      
      if (audioData) break
    }

    if (!audioData) {
      console.error('[API TTS v1.2] ALL ATTEMPTS FAILED:', errorLog.join(' | '))
      return NextResponse.json({ 
        error: 'Failed to generate audio after multiple models and prompt variations.',
        details: errorLog
      }, { status: 500 })
    }

    // 3. Convert to WAV
    const rawBase64 = audioData.data
    const rawMimeType = audioData.mimeType || 'audio/L16;rate=24000'
    const rateMatch = rawMimeType.match(/rate=(\d+)/)
    const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
    
    const audioBase64 = pcmToWav(rawBase64, sampleRate)
    const mimeType = 'audio/wav'

    // 4. Cache
    try {
      await db.insert(tts_cache).values({
        id: cacheId,
        text,
        language: language || 'unknown',
        voice_name: VOICE_NAME,
        audio_base64: audioBase64,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      })
    } catch (e) {}

    return NextResponse.json({
      audio: audioBase64,
      mimeType: mimeType,
      cached: false
    })

  } catch (error) {
    console.error('Error in TTS route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
