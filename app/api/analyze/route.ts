import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

interface AnalyzedItem {
  id?: string
  text: string
  type: 'word' | 'expression' | 'sentence'
  explanation: string
}

interface GeminiResponse {
  items: AnalyzedItem[]
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { transcription, language, isAIScenario, forceNew } = await request.json()

    if (!transcription || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let prompt = ""

    if (isAIScenario) {
      prompt = `Based on this scenario description: "${transcription}"
      
      First, detect which language the scenario description is written in.
      Then, generate a list of 8-10 useful words, expressions, and sentences IN THAT SAME LANGUAGE that would be essential for this specific situation.
      
      CRITICAL: The "text" field for every item MUST be in the same language as the scenario description. 
      Do NOT translate to another language. If the description is in English, generate English items. If in Hungarian, generate Hungarian items, etc.
      ${forceNew ? "IMPORTANT: Generate a FRESH set of items, different from common defaults. Focus on nuanced or varied expressions." : ""}
      
      For each item, provide a brief explanation in English of why it's valuable to learn for this scenario.
      Respond in this exact JSON format:
      {
        "detectedLanguage": "2-letter ISO language code of the scenario description (e.g., 'en', 'da', 'hu')",
        "items": [
          {
            "id": "unique_id",
            "text": "The word/expression/sentence in the SAME language as the description",
            "type": "word/expression/sentence",
            "explanation": "brief explanation in English"
          }
        ]
      }`
    } else {
      prompt = `Analyze this text and extract important words, expressions, and sentences. 
      ${language !== 'any' ? `The text is primarily in ${language}.` : 'First, detect which language this text is written in.'}
      For each item, provide a brief explanation in English of why it's valuable to learn.
      Focus on essential language elements that would be valuable for a language learner.
      Keep explanations very short (max 10 words) and in English only.

      Text to analyze:
      ${transcription}

      Respond in this exact JSON format:
      {
        "detectedLanguage": "2-letter ISO language code (e.g., 'da', 'hu', 'en')",
        "items": [
          {
            "id": "unique_id",
            "text": "original text",
            "type": "word/expression/sentence",
            "explanation": "brief explanation in English"
          }
        ]
      }`
    }

    console.log(`Sending request to Gemini (isAIScenario: ${isAIScenario})...`)
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        systemInstruction: `You are a language learning assistant. ${isAIScenario ? 'Generate' : 'Analyze'} the content and provide important language elements.
          Provide explanations in English only, even for non-English content.
          Keep explanations very concise (max 10 words).
          Focus on essential vocabulary and expressions.`,
        responseMimeType: "application/json",
        temperature: forceNew ? 0.9 : 0.7,
      }
    })

    console.log('Received response from Gemini')
    const responseText = completion.text
    console.log('Response content:', responseText)

    if (!responseText) {
      throw new Error('No response from Gemini')
    }

    const data = JSON.parse(responseText) as GeminiResponse
    
    // Validate and ensure explanations are in English
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid response format')
    }

    // Ensure all explanations are strings and not too long
    data.items = data.items.map(item => ({
      ...item,
      explanation: typeof item.explanation === 'string' 
        ? item.explanation.slice(0, 100) // Limit length
        : 'Explanation not provided'
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error analyzing text:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze text' },
      { status: 500 }
    )
  }
}