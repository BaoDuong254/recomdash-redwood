/**
 * Lazy Redis client singleton for the RedwoodJS API layer.
 *
 * Used only for publishing events to Redis Pub/Sub after successful mutations.
 * Install the client with:  yarn workspace api add ioredis
 */
import Redis from 'ioredis'

import { logger } from './logger'

let client: Redis | null = null

/**
 * Returns a shared ioredis client.  The connection is created on first call
 * and reused for all subsequent calls.
 *
 * Returns null when Redis env vars are not configured so that the API layer
 * degrades gracefully (mutations succeed, events are just not published).
 */
export function getRedisClient(): Redis | null {
  if (client) return client

  const host = process.env.REDIS_HOST
  const port = process.env.REDIS_PORT

  if (!host || !port) {
    logger.warn(
      'Redis not configured — skipping event publishing (REDIS_HOST / REDIS_PORT missing)'
    )
    return null
  }

  client = new Redis({
    host,
    port: parseInt(port, 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    lazyConnect: false,
    enableOfflineQueue: false, // Drop messages when disconnected rather than buffering
    connectTimeout: 5000,
    maxRetriesPerRequest: 2,
  })

  client.on('connect', () => logger.info('Redis client connected'))
  client.on('error', (err) => logger.warn({ err }, 'Redis client error'))
  client.on('close', () => {
    // Reset so the next call re-creates the client
    client = null
  })

  return client
}
