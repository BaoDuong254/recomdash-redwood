/**
 * chat.ts — GraphQL resolver for the `chatMessage` mutation.
 *
 * Flow:
 *  1. If a confirmationToken is present, verify it and execute the pending
 *     destructive action directly (skipping Gemini).
 *  2. Otherwise, call Gemini → validate the JSON response → route to the
 *     right executor.
 *  3. For destructive intents, skip execution and return a confirmation
 *     prompt + signed token instead.
 */
import crypto from 'crypto'

import { ForbiddenError } from '@redwoodjs/graphql-server'

import { logger } from 'src/lib/logger'

import { getDashboardMetrics } from './executors/dashboardExecutor'
import {
  createNewOrder,
  deleteExistingOrder,
  getOrder,
  getOrderMetrics,
  listOrders,
  updateOrderStatus,
} from './executors/orderExecutor'
import {
  createNewProduct,
  deleteExistingProduct,
  getProduct,
  listLowStock,
  listProducts,
  updateExistingProduct,
} from './executors/productExecutor'
import type { ChatResult } from './executors/types'
import {
  createNewUser,
  deleteExistingUser,
  getUser,
  listUsers,
  updateExistingUser,
} from './executors/userExecutor'
import { callGemini } from './gemini'
import {
  DESTRUCTIVE_INTENTS,
  GeminiResponseSchema,
  type IntentName,
  type ParsedGeminiResponse,
} from './validators/intentValidator'

// ---------------------------------------------------------------------------
// Confirmation token (HMAC-signed, 60-second TTL)
// ---------------------------------------------------------------------------

interface PendingAction {
  intent: IntentName
  parameters: Record<string, unknown>
  exp: number
}

function signConfirmationToken(
  intent: IntentName,
  parameters: Record<string, unknown>
): string {
  const secret = process.env.SESSION_SECRET ?? 'dev-secret'
  const payload: PendingAction = {
    intent,
    parameters,
    exp: Date.now() + 60_000,
  }
  const data = JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url')
}

function verifyConfirmationToken(token: string): PendingAction | null {
  try {
    const secret = process.env.SESSION_SECRET ?? 'dev-secret'
    const { data, sig } = JSON.parse(
      Buffer.from(token, 'base64url').toString()
    ) as {
      data: string
      sig: string
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, 'hex'),
        Buffer.from(expected, 'hex')
      )
    ) {
      return null
    }
    const payload = JSON.parse(data) as PendingAction
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Intent router
// ---------------------------------------------------------------------------

async function routeIntent(parsed: ParsedGeminiResponse): Promise<ChatResult> {
  const raw = parsed.parameters as Record<string, unknown>

  switch (parsed.intent) {
    // Products
    case 'LIST_PRODUCTS':
      return listProducts(raw)
    case 'GET_PRODUCT':
      return getProduct(raw)
    case 'CREATE_PRODUCT':
      return createNewProduct(raw)
    case 'UPDATE_PRODUCT':
      return updateExistingProduct(raw)
    case 'DELETE_PRODUCT':
      return deleteExistingProduct(raw)
    case 'LIST_LOW_STOCK':
      return listLowStock()

    // Orders
    case 'LIST_ORDERS':
      return listOrders(raw)
    case 'GET_ORDER':
      return getOrder(raw)
    case 'CREATE_ORDER':
      return createNewOrder(raw)
    case 'UPDATE_ORDER_STATUS':
      return updateOrderStatus(raw)
    case 'DELETE_ORDER':
      return deleteExistingOrder(raw)
    case 'GET_ORDER_METRICS':
      return getOrderMetrics(raw)

    // Users
    case 'LIST_USERS':
      return listUsers(raw)
    case 'GET_USER':
      return getUser(raw)
    case 'CREATE_USER':
      return createNewUser(raw)
    case 'UPDATE_USER':
      return updateExistingUser(raw)
    case 'DELETE_USER':
      return deleteExistingUser(raw)

    // Dashboard
    case 'GET_DASHBOARD_METRICS':
      return getDashboardMetrics(raw)

    // Unknown / clarification needed
    case 'UNKNOWN':
      return { reply: parsed.reply, data: null, success: false }

    default:
      return {
        reply: 'I encountered an unexpected intent. Please try rephrasing.',
        data: null,
        success: false,
      }
  }
}

// ---------------------------------------------------------------------------
// GraphQL resolver
// ---------------------------------------------------------------------------

interface ChatMessageInput {
  message: string
  history?: Array<{ role: string; content: string }> | null
  confirmationToken?: string | null
}

interface ChatResponse {
  reply: string
  data: string | null
  success: boolean
  requiresConfirmation: boolean
  confirmationToken: string | null
}

export const chatMessage = async ({
  input,
}: {
  input: ChatMessageInput
}): Promise<ChatResponse> => {
  // ── Confirmation path ──────────────────────────────────────────────────────
  if (input.confirmationToken) {
    const pending = verifyConfirmationToken(input.confirmationToken)
    if (!pending) {
      throw new ForbiddenError(
        'Confirmation token is invalid or has expired. Please try again.'
      )
    }

    logger.info(
      { intent: pending.intent },
      'Executing confirmed destructive action'
    )

    const fakeParsed: ParsedGeminiResponse = {
      intent: pending.intent,
      entity: '',
      action: '',
      parameters: pending.parameters,
      reply: '',
    }

    const result = await routeIntent(fakeParsed)
    return {
      reply: result.reply,
      data: result.data,
      success: result.success,
      requiresConfirmation: false,
      confirmationToken: null,
    }
  }

  // ── Normal path ────────────────────────────────────────────────────────────
  let geminiRaw: unknown
  try {
    geminiRaw = await callGemini(input.message, input.history ?? [])
  } catch (err) {
    logger.error({ err }, 'Gemini call failed')
    return {
      reply: 'I had trouble connecting to the AI service. Please try again.',
      data: null,
      success: false,
      requiresConfirmation: false,
      confirmationToken: null,
    }
  }

  const validation = GeminiResponseSchema.safeParse(geminiRaw)
  if (!validation.success) {
    logger.error(
      { geminiRaw, errors: validation.error.issues },
      'Gemini response failed validation'
    )
    return {
      reply:
        'The AI returned an unexpected response. Please try rephrasing your request.',
      data: null,
      success: false,
      requiresConfirmation: false,
      confirmationToken: null,
    }
  }

  const parsed = validation.data
  logger.info({ intent: parsed.intent }, 'Parsed chat intent')

  // ── Destructive intent → ask for confirmation ──────────────────────────────
  if (DESTRUCTIVE_INTENTS.includes(parsed.intent)) {
    const token = signConfirmationToken(
      parsed.intent,
      parsed.parameters as Record<string, unknown>
    )
    return {
      reply: parsed.reply,
      data: null,
      success: true,
      requiresConfirmation: true,
      confirmationToken: token,
    }
  }

  // ── Execute the intent ─────────────────────────────────────────────────────
  try {
    const result = await routeIntent(parsed)
    return {
      reply: result.reply,
      data: result.data,
      success: result.success,
      requiresConfirmation: false,
      confirmationToken: null,
    }
  } catch (err) {
    logger.error({ err, intent: parsed.intent }, 'Executor threw an error')
    return {
      reply:
        'Something went wrong while processing your request. Please try again.',
      data: null,
      success: false,
      requiresConfirmation: false,
      confirmationToken: null,
    }
  }
}
