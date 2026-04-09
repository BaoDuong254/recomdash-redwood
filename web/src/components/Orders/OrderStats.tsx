import { cn } from 'src/lib/utils'

import type { OrderStats } from './types'

type StatCardProps = {
  title: string
  value: number
  dotColor: string
}

const StatCard = ({ title, value, dotColor }: StatCardProps) => (
  <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-5">
    <div className="tw-flex tw-items-center tw-gap-2">
      <span
        className={cn('tw-h-2 tw-w-2 tw-shrink-0 tw-rounded-full', dotColor)}
        aria-hidden="true"
      />
      <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
        {title}
      </p>
    </div>
    <p className="tw-mt-3 tw-text-3xl tw-font-bold tw-text-foreground">
      {value.toLocaleString()}
    </p>
  </div>
)

type OrderStatsProps = {
  stats: OrderStats
}

const OrderStatsCards = ({ stats }: OrderStatsProps) => {
  return (
    <div className="tw-grid tw-grid-cols-2 tw-gap-4 sm:tw-grid-cols-3 lg:tw-grid-cols-5">
      <StatCard
        title="Total Orders"
        value={stats.total}
        dotColor="tw-bg-foreground/40"
      />
      <StatCard
        title="New"
        value={stats.new}
        dotColor="tw-bg-blue-500 dark:tw-bg-blue-400"
      />
      <StatCard
        title="Paid"
        value={stats.paid}
        dotColor="tw-bg-amber-500 dark:tw-bg-amber-400"
      />
      <StatCard
        title="Fulfilled"
        value={stats.fulfilled}
        dotColor="tw-bg-green-500 dark:tw-bg-green-400"
      />
      <StatCard
        title="Cancelled"
        value={stats.cancelled}
        dotColor="tw-bg-red-500 dark:tw-bg-red-400"
      />
    </div>
  )
}

export default OrderStatsCards
