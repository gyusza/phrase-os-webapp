import { NextResponse } from 'next/server'
import OpenAI from 'openai'

interface TranslationItem {
  text: string
  type: string
}

interface TranslationResult {
  text: string
  translation: string
  explanation: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { items, sourceLanguage, targetLanguage } = await request.json()

    if (!items || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array' },
        { status: 400 }
      )
    }

    console.log('Translating items:', {
      items,
      sourceLanguage,
      targetLanguage
    })

    const prompt = `Translate these ${sourceLanguage} items to ${targetLanguage}. 
    For each item, provide:
    1. The translation
    2. A brief explanation in English of any cultural or contextual nuances
    
    Keep explanations in English only, even for non-English content.
    Keep explanations very concise (max 10 words).

    Items to translate:
    ${items.map(item => `- ${item.text} (${item.type})`).join('\n')}

    Respond in this exact JSON format:
    {
      "translations": [
        {
          "text": "original text",
          "translation": "translated text",
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
          content: `You are a language learning assistant. Translate the items from ${sourceLanguage} to ${targetLanguage}.
          Provide explanations in English only, even for non-English content.
          Keep explanations very concise (max 10 words).
          Focus on cultural and contextual nuances.`
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
    const responseContent = completion.choices[0].message.content
    console.log('Response content:', responseContent)

    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    const parsedResponse = JSON.parse(responseContent)
    console.log('Parsed response:', parsedResponse)

    if (!parsedResponse.translations || !Array.isArray(parsedResponse.translations)) {
      console.error('Invalid response format from OpenAI:', parsedResponse)
      throw new Error('Invalid response format from OpenAI')
    }

    // Validate and ensure explanations are in English
    parsedResponse.translations = parsedResponse.translations.map((item: { explanation: string }) => ({
      ...item,
      explanation: typeof item.explanation === 'string' 
        ? item.explanation.slice(0, 100) // Limit length
        : 'Explanation not provided'
    }))

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Error translating text:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to translate text' },
      { status: 500 }
    )
  }
} 