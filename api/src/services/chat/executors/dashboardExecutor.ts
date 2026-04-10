import { dashboardStats } from 'src/services/dashboard/dashboard'

import { Params } from '../validators/intentValidator'

import type { ChatResult } from './types'

function ok(reply: string, data?: unknown): ChatResult {
  return { reply, data: data ? JSON.stringify(data) : null, success: true }
}

function err(reply: string): ChatResult {
  return { reply, data: null, success: false }
}

export async function getDashboardMetrics(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.GET_DASHBOARD_METRICS.safeParse(raw)
  if (!p.success)
    return err('Invalid time range. Valid values: today, 7d, 30d, 12m.')

  const stats = await dashboardStats({ timeRange: p.data.timeRange })
  const m = stats.metrics

  const trend = (v: number) => (v >= 0 ? `+${v}%` : `${v}%`)

  const reply =
    `**Dashboard Summary (${p.data.timeRange})**\n` +
    `Revenue: $${m.totalRevenue.toLocaleString()} (${trend(m.revenueTrend)})\n` +
    `Orders: ${m.totalOrders} (${trend(m.ordersTrend)})\n` +
    `Active Users: ${m.activeUsers} (${trend(m.activeUsersTrend)})\n` +
    `Avg. Order Value: $${m.avgOrderValue}\n\n` +
    `**Order Status**\n` +
    stats.orderStatus.map((s) => `${s.label}: ${s.value}`).join(' | ')

  return ok(reply, stats)
}
