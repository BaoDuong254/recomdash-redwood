import * as React from 'react'

import { CalendarDays, ChevronDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import { cn } from 'src/lib/utils'

export type TimeRange = 'today' | '7d' | '30d' | '12m'

interface TimeRangeOption {
  value: TimeRange
  label: string
  /** Label shown in MetricCard trend rows */
  trendLabel: string
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: 'today', label: 'Today', trendLabel: 'vs yesterday' },
  { value: '7d', label: 'Last 7 days', trendLabel: 'vs prev. 7 days' },
  { value: '30d', label: 'Last 30 days', trendLabel: 'vs prev. 30 days' },
  { value: '12m', label: 'Last 12 months', trendLabel: 'vs prev. 12 months' },
]

export interface DashboardHeaderProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

const DashboardHeader = ({
  timeRange,
  onTimeRangeChange,
}: DashboardHeaderProps) => {
  const selected = TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)!

  return (
    <div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
      {/* Title block */}
      <div>
        <h1 className="tw-text-2xl tw-font-bold tw-text-foreground">
          Dashboard Overview
        </h1>
        <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
          Welcome back. Here&apos;s what&apos;s happening in your store today.
        </p>
      </div>

      {/* Time range selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'tw-flex tw-shrink-0 tw-items-center tw-gap-2',
              'tw-rounded-lg tw-border tw-border-border tw-bg-card',
              'tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-foreground',
              'tw-transition-colors hover:tw-bg-accent hover:tw-text-accent-foreground',
              'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring'
            )}
            aria-label="Select time range"
          >
            <CalendarDays
              className="tw-h-4 tw-w-4 tw-text-muted-foreground"
              aria-hidden="true"
            />
            <span>{selected.label}</span>
            <ChevronDown
              className="tw-h-3.5 tw-w-3.5 tw-text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="tw-w-44">
          {TIME_RANGE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onTimeRangeChange(option.value)}
              className={cn(
                option.value === timeRange &&
                  'tw-bg-accent tw-text-accent-foreground'
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default DashboardHeader
