/**
 * intentValidator.ts
 *
 * Zod schemas that validate the JSON Gemini returns before any executor
 * touches the parameters. Treat all AI output as untrusted input.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Intent enum
// ---------------------------------------------------------------------------

export const INTENTS = [
  'LIST_PRODUCTS',
  'GET_PRODUCT',
  'CREATE_PRODUCT',
  'UPDATE_PRODUCT',
  'DELETE_PRODUCT',
  'LIST_LOW_STOCK',
  'LIST_ORDERS',
  'GET_ORDER',
  'CREATE_ORDER',
  'UPDATE_ORDER_STATUS',
  'DELETE_ORDER',
  'GET_ORDER_METRICS',
  'LIST_USERS',
  'GET_USER',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'GET_DASHBOARD_METRICS',
  'UNKNOWN',
] as const

export type IntentName = (typeof INTENTS)[number]

export const DESTRUCTIVE_INTENTS: IntentName[] = [
  'DELETE_PRODUCT',
  'DELETE_ORDER',
  'DELETE_USER',
]

// ---------------------------------------------------------------------------
// Gemini response envelope
// ---------------------------------------------------------------------------

export const GeminiResponseSchema = z.object({
  // Cast needed: z.enum requires a mutable tuple, but INTENTS is readonly.
  // The resulting type is narrowed back to IntentName via the transform below.
  intent: z
    .enum(INTENTS as unknown as [string, ...string[]])
    .transform((v) => v as IntentName),
  entity: z.string(),
  action: z.string(),
  parameters: z.record(z.unknown()).default({}),
  reply: z.string().min(1),
})

export type ParsedGeminiResponse = z.infer<typeof GeminiResponseSchema>

// ---------------------------------------------------------------------------
// Per-intent parameter schemas
// ---------------------------------------------------------------------------

const ProductStatusEnum = z.enum(['active', 'draft', 'archived'])
const OrderStatusEnum = z.enum(['NEW', 'PAID', 'FULFILLED', 'CANCELLED'])
const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'REFUNDED'])
const UserRoleEnum = z.enum(['ADMIN', 'USER', 'SELLER', 'STAFF'])
const UserStatusEnum = z.enum(['ACTIVE', 'INACTIVE'])
const TimeRangeEnum = z.enum(['today', '7d', '30d', '12m']).default('30d')

export const Params = {
  LIST_PRODUCTS: z.object({
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().max(50).optional().default(10),
    search: z.string().optional(),
    category: z.string().optional(),
    status: ProductStatusEnum.optional(),
  }),

  GET_PRODUCT: z.object({
    id: z.string().optional(),
    search: z.string().optional(),
  }),

  CREATE_PRODUCT: z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    price: z.number().positive(),
    inventory: z.number().int().min(0),
    category: z.string().min(1),
    status: ProductStatusEnum.optional().default('draft'),
    description: z.string().optional(),
    lowStockThreshold: z.number().int().min(0).optional().default(10),
  }),

  UPDATE_PRODUCT: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    price: z.number().positive().optional(),
    inventory: z.number().int().min(0).optional(),
    status: ProductStatusEnum.optional(),
    category: z.string().optional(),
    description: z.string().optional(),
  }),

  DELETE_PRODUCT: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
  }),

  LIST_LOW_STOCK: z.object({}),

  LIST_ORDERS: z.object({
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().max(50).optional().default(10),
    search: z.string().optional(),
    status: OrderStatusEnum.optional(),
    paymentStatus: PaymentStatusEnum.optional(),
  }),

  GET_ORDER: z.object({
    id: z.string().optional(),
    orderNumber: z.string().optional(),
  }),

  CREATE_ORDER: z.object({
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    status: OrderStatusEnum.optional().default('NEW'),
    paymentStatus: PaymentStatusEnum.optional().default('PENDING'),
    items: z
      .array(
        z.object({
          // At least one of productId or productName must be provided.
          // The executor resolves whichever is missing from the database.
          productId: z.string().optional(),
          productName: z.string().optional(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
  }),

  UPDATE_ORDER_STATUS: z.object({
    id: z.string().min(1),
    status: OrderStatusEnum,
    paymentStatus: PaymentStatusEnum.optional(),
  }),

  DELETE_ORDER: z.object({
    id: z.string().optional(),
    orderNumber: z.string().optional(),
  }),

  GET_ORDER_METRICS: z.object({
    timeRange: TimeRangeEnum,
  }),

  LIST_USERS: z.object({
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().max(50).optional().default(10),
    search: z.string().optional(),
    role: UserRoleEnum.optional(),
    status: UserStatusEnum.optional(),
  }),

  GET_USER: z.object({
    id: z.string().optional(),
    email: z.string().email().optional(),
  }),

  CREATE_USER: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: UserRoleEnum,
    status: UserStatusEnum.optional().default('ACTIVE'),
  }),

  UPDATE_USER: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    role: UserRoleEnum.optional(),
    status: UserStatusEnum.optional(),
  }),

  DELETE_USER: z.object({
    id: z.string().optional(),
    email: z.string().email().optional(),
  }),

  GET_DASHBOARD_METRICS: z.object({
    timeRange: TimeRangeEnum,
  }),

  UNKNOWN: z.object({}).passthrough(),
}
