import { NextResponse } from 'next/server'
import OpenAI from 'openai'

interface AnalyzedItem {
  id?: string
  text: string
  type: 'word' | 'expression' | 'sentence'
  explanation: string
}

interface OpenAIResponse {
  items: AnalyzedItem[]
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    console.log('Sending request to OpenAI...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a language learning assistant. Analyze the text and extract important language elements.
          Provide explanations in English only, even for non-English content.
          Keep explanations very concise (max 10 words).
          Focus on essential vocabulary and expressions.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    })

    console.log('Received response from OpenAI')
    const response = completion.choices[0].message.content
    console.log('Response content:', response)

    if (!response) {
      throw new Error('No response from OpenAI')
    }

    const data = JSON.parse(response) as OpenAIResponse
    
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