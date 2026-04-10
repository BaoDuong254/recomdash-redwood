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
// GraphQL queries — baselines used while Go projection is not yet ready.
//
// Two separate queries are needed because they have different semantics:
//
//  ALL_TIME_STATS_QUERY  — KPI totals with NO time-range filter.
//    Mirrors Go's all-time projection (sum of all non-deleted orders).
//    Fetched once on mount; does NOT change when timeRange changes.
//    Prevents "only today's data" when Go bootstrap is in progress.
//
//  DASHBOARD_BASELINE_QUERY — charts + trends + activeUsers.
//    Time-range-scoped (re-fetched on timeRange change).
//    Charts and trend percentages are always relative to the selected range.
// ---------------------------------------------------------------------------

const ALL_TIME_STATS_QUERY = gql`
  query AllTimeStatsQuery {
    allTimeStats {
      totalRevenue
      totalOrders
      avgOrderValue
    }
  }
`

const DASHBOARD_BASELINE_QUERY = gql`
  query DashboardBaselineQuery($timeRange: String!) {
    dashboardStats(timeRange: $timeRange) {
      metrics {
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
  const rangeOption =
    TIME_RANGE_OPTIONS.find((o) => o.value === timeRange) ??
    TIME_RANGE_OPTIONS[0]
  const trendLabel = rangeOption.trendLabel

  // All-time KPI totals — fetched once, not re-fetched on timeRange changes.
  // Used as the KPI fallback while Go bootstrap is in progress so the cards
  // always show the correct all-time totals (never time-range-scoped numbers).
  const { data: allTimeData } = useQuery(ALL_TIME_STATS_QUERY)

  // Time-range-scoped GraphQL baseline — charts, trends, activeUsers.
  // Re-fetched whenever timeRange changes (infrequent).
  const { data: baselineData } = useQuery(DASHBOARD_BASELINE_QUERY, {
    variables: { timeRange },
  })

  // Go WebSocket — full live dashboard projection.
  const { snapshot, connected } = useRealtimeDashboard()

  // The Go projection is only trusted once it has been hydrated from a reliable
  // source (Redis on restart, or DB bootstrap on cold start).
  // ready=false means we must NOT render Go data — fall back to GraphQL.
  const isGoReady = snapshot?.ready === true

  const gqlStats = baselineData?.dashboardStats
  const gqlMetrics = gqlStats?.metrics
  const gqlAllTime = allTimeData?.allTimeStats

  // ── Chart datasets ────────────────────────────────────────────────────────
  //
  // Source priority:
  //   Go ready   → Go snapshot  (updates on every order event, no GQL round-trip)
  //   Go not ready → GraphQL baseline (non-zero DB data while bootstrap runs)
  //
  // Chart arrays default to [] only after we know which source to use.
  // Never default to [] while both sources are still loading (show skeleton
  // or the last-known values instead of a misleading empty chart).
  const weeklySales: SalesDataPoint[] = isGoReady
    ? (snapshot!.weeklySales ?? [])
    : (gqlStats?.weeklySales ?? [])

  const monthlySales: SalesDataPoint[] = isGoReady
    ? (snapshot!.monthlySales ?? [])
    : (gqlStats?.monthlySales ?? [])

  const yearlySales: SalesDataPoint[] = isGoReady
    ? (snapshot!.yearlySales ?? [])
    : (gqlStats?.yearlySales ?? [])

  // orderStatus: Go provides all ranges in one snapshot; GraphQL provides the
  // current timeRange only.
  const orderStatusData: OrderStatusItem[] = isGoReady
    ? (snapshot!.orderStatus[timeRange] ?? [])
    : (gqlStats?.orderStatus ?? [])

  const totalOrders = orderStatusData.reduce((s, i) => s + i.value, 0)

  // ── KPI metrics ───────────────────────────────────────────────────────────
  //
  // Render null (→ skeleton) only while BOTH sources are still loading.
  // Once either is available, show real data — never show hardcoded zeros.
  //
  // KPI totals (totalRevenue, totalOrders, avgOrderValue) are ALL-TIME values:
  //   • Go ready  → snapshot.metrics  (maintained by the realtime projection)
  //   • Go not ready → allTimeStats   (dedicated all-time GraphQL query)
  //
  // Using the all-time GraphQL query ensures the KPI cards always show the
  // full dataset (all 445 orders, not just today's) while Go is bootstrapping.
  const metrics = React.useMemo(() => {
    if (!isGoReady && !gqlAllTime) {
      // Neither source has loaded yet — hold the skeleton.
      return null
    }

    return {
      // All-time totals: Go snapshot when ready, dedicated all-time query otherwise.
      totalRevenue: isGoReady
        ? snapshot!.metrics.totalRevenue
        : gqlAllTime!.totalRevenue,
      totalOrders: isGoReady
        ? snapshot!.metrics.totalOrders
        : gqlAllTime!.totalOrders,
      avgOrderValue: isGoReady
        ? snapshot!.metrics.avgOrderValue
        : gqlAllTime!.avgOrderValue,
      // Trend percentages and activeUsers are always time-range-scoped from GraphQL.
      activeUsers: gqlMetrics?.activeUsers ?? 0,
      revenueTrend: gqlMetrics?.revenueTrend ?? 0,
      ordersTrend: gqlMetrics?.ordersTrend ?? 0,
      avgOrderValueTrend: gqlMetrics?.avgOrderValueTrend ?? 0,
      activeUsersTrend: gqlMetrics?.activeUsersTrend ?? 0,
    }
  }, [snapshot, isGoReady, gqlAllTime, gqlMetrics])

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
        {!metrics ? (
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
        <OrderStatusChart
          data={orderStatusData}
          totalOrders={totalOrders}
          rangeLabel={rangeOption.label}
        />
      </div>
    </div>
  )
}

export default DashboardContent
