/**
 * useRealtimeDashboard
 *
 * Connects to the Go service WebSocket and exposes the full live dashboard
 * projection (KPI metrics + chart datasets + order status counts).
 *
 * The Go service sends:
 *   dashboard.snapshot — full state delivered once on connect
 *   dashboard.updated  — full state after every processed order event
 *
 * Usage:
 *   const { snapshot, connected } = useRealtimeDashboard()
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

export interface SalesBucket {
  label: string
  revenue: number
}

export interface StatusCount {
  label: string
  value: number
  color: string
}

export interface OrderStatusByRange {
  today: StatusCount[]
  '7d': StatusCount[]
  '30d': StatusCount[]
  '12m': StatusCount[]
}

export interface DashboardSnapshot {
  metrics: MetricsSnapshot
  weeklySales: SalesBucket[]
  monthlySales: SalesBucket[]
  yearlySales: SalesBucket[]
  orderStatus: OrderStatusByRange
  generatedAt: string
  version: number
  /**
   * ready=false means the Go projection has NOT been hydrated from a reliable
   * source yet (empty Redis on startup, bootstrap in progress).
   * Consumers MUST ignore the data fields when ready=false and render from
   * their own fallback source (e.g. GraphQL baseline).
   */
  ready: boolean
  /** Which source completed the hydration: "redis" | "db-bootstrap" | "empty" */
  bootstrapSource: string
}

type WSMessageType =
  | 'dashboard.snapshot'
  | 'dashboard.updated'
  // Legacy types kept for forward-compat.
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
  /** Full live projection from Go. null until first message received. */
  snapshot: DashboardSnapshot | null
  /** Convenience alias: snapshot?.metrics (null until connected). */
  metrics: MetricsSnapshot | null
  connected: boolean
}

export function useRealtimeDashboard(): RealtimeDashboardState {
  const [state, setState] = useState<RealtimeDashboardState>({
    snapshot: null,
    metrics: null,
    connected: false,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS)
  const unmountedRef = useRef(false)

  // Store setState in a ref so the WebSocket closure always calls the latest
  // version without needing to rebuild the socket on every render.
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
          case 'dashboard.snapshot':
          case 'dashboard.updated': {
            const snap = msg.payload as DashboardSnapshot
            setStateRef.current((prev) => ({
              ...prev,
              snapshot: snap,
              metrics: snap.metrics,
            }))
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
