import * as React from 'react'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'
import { cn } from 'src/lib/utils'

export interface SalesDataPoint {
  label: string
  revenue: number
}

export type SalesPeriod = 'weekly' | 'monthly' | 'yearly'

export interface SalesChartProps {
  weeklyData: SalesDataPoint[]
  monthlyData: SalesDataPoint[]
  yearlyData: SalesDataPoint[]
}

const PERIOD_LABELS: Record<SalesPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

const formatRevenue = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

interface TooltipPayloadItem {
  value: number
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null

  return (
    <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2 tw-shadow-md">
      <p className="tw-text-xs tw-text-muted-foreground">{label}</p>
      <p className="tw-text-sm tw-font-semibold tw-text-foreground">
        {formatRevenue(payload[0].value)}
      </p>
    </div>
  )
}

const SalesChart = ({
  weeklyData,
  monthlyData,
  yearlyData,
}: SalesChartProps) => {
  const [period, setPeriod] = React.useState<SalesPeriod>('monthly')
  const gradientId = React.useId()

  const dataMap: Record<SalesPeriod, SalesDataPoint[]> = {
    weekly: weeklyData,
    monthly: monthlyData,
    yearly: yearlyData,
  }

  return (
    <Card className="tw-col-span-2">
      <CardHeader className="tw-flex tw-flex-row tw-items-center tw-justify-between tw-space-y-0 tw-pb-4">
        <CardTitle className="tw-text-base tw-font-semibold">
          Sales Overview
        </CardTitle>
        <div
          className="tw-flex tw-gap-1 tw-rounded-lg tw-bg-muted tw-p-1"
          role="tablist"
          aria-label="Sales period"
        >
          {(Object.keys(PERIOD_LABELS) as SalesPeriod[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                'tw-rounded-md tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-transition-colors',
                period === p
                  ? 'tw-bg-card tw-text-foreground tw-shadow-sm'
                  : 'tw-text-muted-foreground hover:tw-text-foreground'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="tw-pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={dataMap[period]}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatRevenue}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default SalesChart
