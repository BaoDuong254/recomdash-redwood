/**
 * gemini.ts — thin wrapper around @google/generative-ai.
 *
 * Responsibilities:
 *  - Build the model with the system prompt
 *  - Forward conversation history so Gemini has context for follow-ups
 *  - Strip markdown fences and parse JSON
 *  - Throw on network / parse errors (caller handles them)
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

import { logger } from 'src/lib/logger'

import { SYSTEM_PROMPT } from './systemPrompt'

export interface ChatHistoryItem {
  role: string
  content: string
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      // Force JSON output — eliminates markdown fences in most cases.
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  })
}

export async function callGemini(
  userMessage: string,
  history: ChatHistoryItem[]
): Promise<unknown> {
  const model = getModel()

  // Pass last 6 turns as context (3 user + 3 assistant pairs).
  const chatHistory = history.slice(-6).map((h) => ({
    role: h.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: h.content }],
  }))

  const chat = model.startChat({ history: chatHistory })
  const result = await chat.sendMessage(userMessage)
  const raw = result.response.text()

  logger.debug({ raw }, 'Gemini raw response')

  // Strip markdown code fences just in case (responseMimeType isn't 100% reliable).
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (err) {
    logger.error({ raw, err }, 'Failed to parse Gemini JSON')
    throw new Error('Gemini returned non-JSON output')
  }
}
