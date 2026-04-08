import * as React from 'react'

import {
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'

import MetricCard, {
  type MetricCardProps,
} from 'src/components/dashboard/MetricCard'
import OrderStatusChart, {
  type OrderStatusItem,
} from 'src/components/dashboard/OrderStatusChart'
import SalesChart, {
  type SalesDataPoint,
} from 'src/components/dashboard/SalesChart'

import { TIME_RANGE_OPTIONS, type TimeRange } from './DashboardHeader'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardContentProps {
  timeRange: TimeRange
}

type MockMetric = Omit<MetricCardProps, 'trendLabel'>

const METRICS: MockMetric[] = [
  { title: 'Total Revenue', value: '$84,250', trend: 12.5, icon: DollarSign },
  { title: 'Total Orders', value: '3,842', trend: 8.2, icon: ShoppingCart },
  { title: 'Avg. Order Value', value: '$21.93', trend: 3.8, icon: ShoppingBag },
  { title: 'Conversion Rate', value: '3.6%', trend: -0.4, icon: TrendingUp },
  { title: 'Active Users', value: '1,204', trend: 21.1, icon: Users },
]

const WEEKLY_DATA: SalesDataPoint[] = [
  { label: 'Mon', revenue: 4200 },
  { label: 'Tue', revenue: 5800 },
  { label: 'Wed', revenue: 5200 },
  { label: 'Thu', revenue: 7100 },
  { label: 'Fri', revenue: 9400 },
  { label: 'Sat', revenue: 8600 },
  { label: 'Sun', revenue: 6300 },
]

const MONTHLY_DATA: SalesDataPoint[] = [
  { label: 'Jan', revenue: 32000 },
  { label: 'Feb', revenue: 28500 },
  { label: 'Mar', revenue: 41000 },
  { label: 'Apr', revenue: 38200 },
  { label: 'May', revenue: 52000 },
  { label: 'Jun', revenue: 47800 },
  { label: 'Jul', revenue: 61000 },
  { label: 'Aug', revenue: 55400 },
  { label: 'Sep', revenue: 68000 },
  { label: 'Oct', revenue: 72000 },
  { label: 'Nov', revenue: 84250 },
  { label: 'Dec', revenue: 91000 },
]

const YEARLY_DATA: SalesDataPoint[] = [
  { label: '2020', revenue: 320000 },
  { label: '2021', revenue: 410000 },
  { label: '2022', revenue: 580000 },
  { label: '2023', revenue: 720000 },
  { label: '2024', revenue: 840000 },
  { label: '2025', revenue: 920000 },
]

const ORDER_STATUS_DATA: OrderStatusItem[] = [
  { label: 'Delivered', value: 1842, color: '#22c55e' },
  { label: 'Processing', value: 1124, color: '#3b82f6' },
  { label: 'Shipped', value: 620, color: '#a855f7' },
  { label: 'Cancelled', value: 256, color: '#ef4444' },
]

const TOTAL_ORDERS = ORDER_STATUS_DATA.reduce(
  (sum, item) => sum + item.value,
  0
)

const DashboardContent = ({ timeRange }: DashboardContentProps) => {
  const trendLabel =
    TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.trendLabel ??
    'vs last period'

  return (
    <div className="tw-space-y-6">
      <div className="tw-grid tw-gap-4 sm:tw-grid-cols-2 lg:tw-grid-cols-5">
        {METRICS.map((card) => (
          <MetricCard key={card.title} {...card} trendLabel={trendLabel} />
        ))}
      </div>

      <div className="tw-grid tw-gap-4 lg:tw-grid-cols-3">
        <SalesChart
          weeklyData={WEEKLY_DATA}
          monthlyData={MONTHLY_DATA}
          yearlyData={YEARLY_DATA}
        />
        <OrderStatusChart data={ORDER_STATUS_DATA} totalOrders={TOTAL_ORDERS} />
      </div>
    </div>
  )
}

export default DashboardContent
