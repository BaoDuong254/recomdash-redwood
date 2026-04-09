/**
 * publisher.ts
 *
 * Thin helper that serialises an order event and publishes it to the
 * appropriate Redis Pub/Sub channel.  Called after successful mutations in
 * the orders service.
 *
 * Design notes:
 * - Never throws: a Redis publish failure must not roll back a DB mutation.
 * - Fire-and-forget: awaiting publish would add latency to every mutation.
 */
import { logger } from './logger'
import { getRedisClient } from './redis'

// ---------------------------------------------------------------------------
// Channel constants — must mirror internal/events/types.go
// ---------------------------------------------------------------------------

export const CHANNEL_ORDER_CREATED = 'orders.created'
export const CHANNEL_ORDER_UPDATED = 'orders.updated'
export const CHANNEL_ORDER_DELETED = 'orders.deleted'

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type OrderChannel =
  | typeof CHANNEL_ORDER_CREATED
  | typeof CHANNEL_ORDER_UPDATED
  | typeof CHANNEL_ORDER_DELETED

export interface OrderEventPayload {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  totalAmount: number
  customerName: string | null
  customerEmail: string | null
  createdAt: Date
  updatedAt: Date
}

interface OrderEvent {
  type: OrderChannel
  payload: OrderEventPayload
  timestamp: string
}

// ---------------------------------------------------------------------------
// Publish helper
// ---------------------------------------------------------------------------

/**
 * Publishes an order event to Redis asynchronously.
 * Call this after a successful DB mutation — do not await the result.
 *
 * @example
 *   const record = await db.order.create(...)
 *   publishOrderEvent(CHANNEL_ORDER_CREATED, toEventPayload(record))
 *   return toOrderShape(record)
 */
export function publishOrderEvent(
  channel: OrderChannel,
  payload: OrderEventPayload
): void {
  const redis = getRedisClient()
  if (!redis) return

  const event: OrderEvent = {
    type: channel,
    payload,
    timestamp: new Date().toISOString(),
  }

  redis.publish(channel, JSON.stringify(event)).catch((err) => {
    logger.warn({ err, channel }, 'Failed to publish order event to Redis')
  })
}
