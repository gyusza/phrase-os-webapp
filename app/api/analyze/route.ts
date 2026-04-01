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
    const { transcription, language } = await request.json()

    if (!transcription || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const prompt = `Analyze this ${language} text and extract important words, expressions, and sentences. 
    For each item, provide a brief explanation in English of why it's valuable to learn.
    Focus on essential language elements that would be valuable for a language learner.
    Keep explanations very short (max 10 words) and in English only.

    Text to analyze:
    ${transcription}

    Respond in this exact JSON format:
    {
      "items": [
        {
          "id": "unique_id",
          "text": "original text",
          "type": "word/expression/sentence",
          "explanation": "brief explanation in English"
        }
      ]
    }`

    console.log('Sending request to Gemini...')
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        systemInstruction: `You are a language learning assistant. Analyze the text and extract important language elements.
          Provide explanations in English only, even for non-English content.
          Keep explanations very concise (max 10 words).
          Focus on essential vocabulary and expressions.`,
        responseMimeType: "application/json",
        temperature: 0.7,
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