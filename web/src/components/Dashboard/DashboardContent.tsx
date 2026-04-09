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

  const { data, loading } = useQuery(DASHBOARD_STATS_QUERY, {
    variables: { timeRange },
  })

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
