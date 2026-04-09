import * as React from 'react'

import { DollarSign, ShoppingBag, ShoppingCart, Users } from 'lucide-react'

import { useQuery } from '@redwoodjs/web'

import MetricCard from 'src/components/Dashboard/MetricCard'
import OrderStatusChart, {
  type OrderStatusItem,
} from 'src/components/Dashboard/OrderStatusChart'
import SalesChart, {
  type SalesDataPoint,
} from 'src/components/Dashboard/SalesChart'
import { useRealtimeDashboard } from 'src/hooks/useRealtimeDashboard'

import { TIME_RANGE_OPTIONS, type TimeRange } from './DashboardHeader'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const DASHBOARD_STATS_QUERY = gql`
  query DashboardStatsQuery($timeRange: String!) {
    dashboardStats(timeRange: $timeRange) {
      metrics {
        totalRevenue
        totalOrders
        avgOrderValue
        activeUsers
        revenueTrend
        ordersTrend
        avgOrderValueTrend
        activeUsersTrend
      }
      weeklySales {
        label
        revenue
      }
      monthlySales {
        label
        revenue
      }
      yearlySales {
        label
        revenue
      }
      orderStatus {
        label
        value
        color
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

const MetricSkeleton = () => (
  <div className="tw-h-full tw-rounded-xl tw-border tw-border-border tw-bg-card tw-p-5">
    <div className="tw-flex tw-items-center tw-justify-between">
      <div className="tw-h-3 tw-w-24 tw-animate-pulse tw-rounded tw-bg-muted" />
      <div className="tw-h-10 tw-w-10 tw-animate-pulse tw-rounded-full tw-bg-muted" />
    </div>
    <div className="tw-mt-4 tw-h-7 tw-w-20 tw-animate-pulse tw-rounded tw-bg-muted" />
    <div className="tw-mt-3 tw-h-3 tw-w-32 tw-animate-pulse tw-rounded tw-bg-muted" />
  </div>
)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DashboardContentProps {
  timeRange: TimeRange
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DashboardContent = ({ timeRange }: DashboardContentProps) => {
  const trendLabel =
    TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.trendLabel ??
    'vs last period'

  const { data, loading, refetch } = useQuery(DASHBOARD_STATS_QUERY, {
    variables: { timeRange },
  })

  // Connect to the Go WebSocket service.  Any order event (create / update /
  // delete) sets a new `latestOrder` reference — we use that as a signal to
  // refetch the GraphQL query so KPI cards, trend percentages, and charts all
  // stay in sync with the current time-range selection.
  const { latestOrder, connected } = useRealtimeDashboard()

  React.useEffect(() => {
    if (!latestOrder) return
    // Debounce: if several events arrive in quick succession (e.g. order
    // generator in fast mode), wait 400 ms and fire a single refetch.
    const timer = setTimeout(() => {
      refetch()
    }, 400)
    return () => clearTimeout(timer)
  }, [latestOrder, refetch])

  const stats = data?.dashboardStats

  // Derived chart arrays (fall back to empty arrays while loading)
  const weeklySales: SalesDataPoint[] = stats?.weeklySales ?? []
  const monthlySales: SalesDataPoint[] = stats?.monthlySales ?? []
  const yearlySales: SalesDataPoint[] = stats?.yearlySales ?? []
  const orderStatusData: OrderStatusItem[] = stats?.orderStatus ?? []
  const totalOrders = orderStatusData.reduce((s, i) => s + i.value, 0)

  const metrics = stats?.metrics

  return (
    <div className="tw-space-y-6">
      {/* ── Realtime connection indicator ─────────────────────────────────── */}
      <div className="tw-flex tw-justify-end">
        {connected ? (
          <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-muted-foreground">
            <span className="tw-relative tw-flex tw-h-2 tw-w-2">
              <span className="tw-absolute tw-inline-flex tw-h-full tw-w-full tw-animate-ping tw-rounded-full tw-bg-green-400 tw-opacity-75" />
              <span className="tw-relative tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full tw-bg-green-500" />
            </span>
            Live
          </div>
        ) : (
          <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-muted-foreground">
            <span className="tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full tw-bg-muted-foreground/40" />
            Connecting…
          </div>
        )}
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="tw-grid tw-gap-4 sm:tw-grid-cols-2 lg:tw-grid-cols-4">
        {loading || !metrics ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              trend={metrics.revenueTrend}
              trendLabel={trendLabel}
              icon={DollarSign}
            />
            <MetricCard
              title="Total Orders"
              value={formatCount(metrics.totalOrders)}
              trend={metrics.ordersTrend}
              trendLabel={trendLabel}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Avg. Order Value"
              value={formatCurrency(metrics.avgOrderValue)}
              trend={metrics.avgOrderValueTrend}
              trendLabel={trendLabel}
              icon={ShoppingBag}
            />
            <MetricCard
              title="Active Users"
              value={formatCount(metrics.activeUsers)}
              trend={metrics.activeUsersTrend}
              trendLabel={trendLabel}
              icon={Users}
            />
          </>
        )}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="tw-grid tw-gap-4 lg:tw-grid-cols-3">
        <SalesChart
          weeklyData={weeklySales}
          monthlyData={monthlySales}
          yearlyData={yearlySales}
        />
        <OrderStatusChart data={orderStatusData} totalOrders={totalOrders} />
      </div>
    </div>
  )
}

export default DashboardContent
