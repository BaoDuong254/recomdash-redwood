/**
 * useRealtimeDashboard
 *
 * Connects to the Go service WebSocket and exposes the latest metrics snapshot
 * plus a stream of recent order events.
 *
 * Usage:
 *   const { metrics, latestOrder, connected } = useRealtimeDashboard()
 *
 * The hook is fully self-contained: components don't need to know whether data
 * arrives via GraphQL or WebSocket.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types mirroring internal/events/types.go
// ---------------------------------------------------------------------------

export interface MetricsSnapshot {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  newOrders: number
  recentOrder: OrderBrief | null
  updatedAt: string
}

export interface OrderBrief {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  customerName: string
  createdAt: string
}

type WSMessageType =
  | 'metrics.updated'
  | 'order.created'
  | 'order.updated'
  | 'order.deleted'

interface WSMessage {
  type: WSMessageType
  payload: unknown
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const WS_URL =
  process.env.REDWOOD_ENV_GO_SERVICE_WS_URL ?? 'ws://localhost:8080'
const RECONNECT_DELAY_MS = 3_000
const MAX_RECONNECT_DELAY_MS = 30_000

interface RealtimeDashboardState {
  metrics: MetricsSnapshot | null
  latestOrder: OrderBrief | null
  connected: boolean
}

export function useRealtimeDashboard(): RealtimeDashboardState {
  const [state, setState] = useState<RealtimeDashboardState>({
    metrics: null,
    latestOrder: null,
    connected: false,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS)
  const unmountedRef = useRef(false)

  // Store setState in a ref so the WebSocket closure always calls the latest
  // version without needing to rebuild the socket on every render.
  // setState from useState is stable, so this effect runs exactly once.
  const setStateRef = useRef(setState)
  useEffect(() => {
    setStateRef.current = setState
  }, [setState])

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    const ws = new WebSocket(`${WS_URL}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectDelayRef.current = RECONNECT_DELAY_MS
      setStateRef.current((prev) => ({ ...prev, connected: true }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage

        switch (msg.type) {
          case 'metrics.updated':
            setStateRef.current((prev) => ({
              ...prev,
              metrics: msg.payload as MetricsSnapshot,
            }))
            break

          case 'order.created':
          case 'order.updated':
          case 'order.deleted': {
            const payload = msg.payload as OrderBrief
            setStateRef.current((prev) => ({ ...prev, latestOrder: payload }))
            break
          }

          default:
            break
        }
      } catch {
        // Ignore malformed messages.
      }
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      setStateRef.current((prev) => ({ ...prev, connected: false }))
      // Exponential back-off reconnect.
      const delay = reconnectDelayRef.current
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS)
      setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  return state
}
