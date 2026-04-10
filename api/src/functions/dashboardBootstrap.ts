/**
 * dashboardBootstrap
 *
 * Internal serverless function called by the Go realtime service on startup
 * when Redis holds no projection.  Returns every non-deleted order's
 * contribution fields so Go can rebuild its full projection from source-of-truth
 * DB data and flip ready=true before serving clients.
 *
 * NOT exposed to the browser — this is a Go→Redwood service call.
 */
import type { APIGatewayEvent } from 'aws-lambda'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = async (event: APIGatewayEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  try {
    // Fetch all non-deleted orders with only the fields needed for the Go
    // projection: id, status, totalAmount, createdAt.
    // orderBy createdAt ASC ensures deterministic rebuild order.
    const orders = await db.order.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const body = JSON.stringify({
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
      })),
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  } catch (error) {
    logger.error({ error }, 'dashboardBootstrap failed')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    }
  }
}
