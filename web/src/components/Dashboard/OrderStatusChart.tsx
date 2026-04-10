import * as React from 'react'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'

export interface OrderStatusItem {
  label: string
  value: number
  color: string
}

export interface OrderStatusChartProps {
  data: OrderStatusItem[]
  totalOrders: number
  /** Label shown below the center count — should reflect the active time range
   *  (e.g. "Today", "Last 7 days") so users know the count is range-scoped. */
  rangeLabel?: string
}

interface TooltipPayloadItem {
  name: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null

  return (
    <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-px-3 tw-py-2 tw-shadow-md">
      <p className="tw-text-xs tw-text-muted-foreground">{payload[0].name}</p>
      <p className="tw-text-sm tw-font-semibold tw-text-foreground">
        {payload[0].value.toLocaleString()} orders
      </p>
    </div>
  )
}

const OrderStatusChart = ({
  data,
  totalOrders,
  rangeLabel,
}: OrderStatusChartProps) => {
  return (
    <Card>
      <CardHeader className="tw-pb-2">
        <CardTitle className="tw-text-base tw-font-semibold">
          Order Status
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="tw-relative tw-flex tw-items-center tw-justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="label"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="tw-pointer-events-none tw-absolute tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
            <span className="tw-text-2xl tw-font-bold tw-text-foreground">
              {totalOrders.toLocaleString()}
            </span>
            <span className="tw-max-w-[80px] tw-text-xs tw-leading-tight tw-text-muted-foreground">
              {rangeLabel ?? 'Orders'}
            </span>
          </div>
        </div>

        <ul className="tw-mt-3 tw-space-y-2.5">
          {data.map((item) => {
            const pct =
              totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0

            return (
              <li
                key={item.label}
                className="tw-flex tw-items-center tw-justify-between tw-text-sm"
              >
                <span className="tw-flex tw-items-center tw-gap-2">
                  <span
                    className="tw-h-2.5 tw-w-2.5 tw-shrink-0 tw-rounded-full"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                  <span className="tw-text-muted-foreground">{item.label}</span>
                </span>
                <span className="tw-font-medium tw-tabular-nums tw-text-foreground">
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

export default OrderStatusChart
