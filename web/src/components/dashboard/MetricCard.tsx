import * as React from 'react'

import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'

import { Card } from 'src/components/ui/card'
import { cn } from 'src/lib/utils'

export interface MetricCardProps {
  title: string
  value: string
  trend: number
  trendLabel: string
  icon: LucideIcon
}

const MetricCard = ({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
}: MetricCardProps) => {
  const isUp = trend > 0
  const isDown = trend < 0
  const TrendIcon = isDown ? TrendingDown : TrendingUp
  const formattedTrend = `${isUp ? '+' : ''}${trend.toFixed(1)}%`

  return (
    <Card className="tw-h-full">
      {/* Bypass CardContent's tw-pt-0 default by padding an inner div directly */}
      <div className="tw-flex tw-h-full tw-flex-col tw-p-5">
        {/* Row 1: title + icon — items-center keeps both on the same axis */}
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
          <p className="tw-text-sm tw-font-medium tw-text-muted-foreground">
            {title}
          </p>
          <div className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-primary/10">
            <Icon
              className="tw-h-5 tw-w-5 tw-text-primary"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Row 2: main value */}
        <p className="tw-mt-3 tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
          {value}
        </p>

        {/* Row 3: trend */}
        <div className="tw-mt-3 tw-flex tw-items-center tw-gap-1.5">
          <span
            className={cn(
              'tw-flex tw-items-center tw-gap-0.5 tw-text-xs tw-font-semibold',
              isUp && 'tw-text-emerald-600 dark:tw-text-emerald-400',
              isDown && 'tw-text-red-500 dark:tw-text-red-400',
              !isUp && !isDown && 'tw-text-muted-foreground'
            )}
          >
            <TrendIcon className="tw-h-3 tw-w-3" aria-hidden="true" />
            {formattedTrend}
          </span>
          <span className="tw-text-xs tw-text-muted-foreground">
            {trendLabel}
          </span>
        </div>
      </div>
    </Card>
  )
}

export default MetricCard
