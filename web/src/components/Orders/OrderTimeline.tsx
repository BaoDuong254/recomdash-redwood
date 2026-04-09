import {
  CheckCircle2,
  Circle,
  Package,
  ShoppingCart,
  XCircle,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'
import { cn } from 'src/lib/utils'

import type { Order } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimelineStatus = 'completed' | 'active' | 'pending' | 'cancelled'

type TimelineEvent = {
  id: string
  title: string
  description: string
  timestamp: string | null
  status: TimelineStatus
  color: string
  dotColor: string
  Icon: React.ElementType
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Derive an offset timestamp from the base (for mock purposes)
function offsetDate(iso: string, minutesOffset: number): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutesOffset)
  return d.toISOString()
}

function buildTimeline(order: Order): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // 1. Order Created — always present
  events.push({
    id: 'created',
    title: 'Order Created',
    description: `Order ${order.orderNumber} was placed by ${order.customer.name ?? order.customer.email}.`,
    timestamp: order.createdAt,
    status: 'completed',
    color: 'tw-text-blue-700 dark:tw-text-blue-400',
    dotColor: 'tw-bg-blue-500 dark:tw-bg-blue-400',
    Icon: ShoppingCart,
  })

  // 2. Payment Received
  const paymentCompleted = order.paymentStatus === 'PAID'
  const paymentRefunded = order.paymentStatus === 'REFUNDED'

  if (paymentRefunded) {
    events.push({
      id: 'refunded',
      title: 'Payment Refunded',
      description: 'The payment for this order was refunded.',
      timestamp: offsetDate(order.createdAt, 30),
      status: 'cancelled',
      color: 'tw-text-slate-600 dark:tw-text-slate-400',
      dotColor: 'tw-bg-slate-400 dark:tw-bg-slate-500',
      Icon: XCircle,
    })
  } else {
    events.push({
      id: 'payment',
      title: 'Payment Received',
      description: paymentCompleted
        ? 'Payment was successfully processed.'
        : 'Waiting for payment confirmation.',
      timestamp: paymentCompleted ? offsetDate(order.createdAt, 15) : null,
      status: paymentCompleted ? 'completed' : 'pending',
      color: paymentCompleted
        ? 'tw-text-amber-700 dark:tw-text-amber-400'
        : 'tw-text-muted-foreground',
      dotColor: paymentCompleted
        ? 'tw-bg-amber-500 dark:tw-bg-amber-400'
        : 'tw-bg-muted-foreground/30',
      Icon: CheckCircle2,
    })
  }

  // 3. Fulfillment / Cancelled
  if (order.status === 'CANCELLED') {
    events.push({
      id: 'cancelled',
      title: 'Order Cancelled',
      description: 'This order was cancelled and will not be fulfilled.',
      timestamp: offsetDate(order.createdAt, 60),
      status: 'cancelled',
      color: 'tw-text-red-700 dark:tw-text-red-400',
      dotColor: 'tw-bg-red-500 dark:tw-bg-red-400',
      Icon: XCircle,
    })
  } else {
    const fulfillmentStarted = order.fulfillmentStatus === 'FULFILLED'

    events.push({
      id: 'fulfillment',
      title: 'Fulfillment Started',
      description: fulfillmentStarted
        ? 'Order items have been picked, packed, and dispatched.'
        : 'Order is being prepared for fulfillment.',
      timestamp: fulfillmentStarted ? offsetDate(order.createdAt, 120) : null,
      status: fulfillmentStarted ? 'completed' : 'pending',
      color: fulfillmentStarted
        ? 'tw-text-green-700 dark:tw-text-green-400'
        : 'tw-text-muted-foreground',
      dotColor: fulfillmentStarted
        ? 'tw-bg-green-500 dark:tw-bg-green-400'
        : 'tw-bg-muted-foreground/30',
      Icon: Package,
    })

    if (order.status === 'FULFILLED') {
      events.push({
        id: 'delivered',
        title: 'Order Fulfilled',
        description: 'All items have been delivered to the customer.',
        timestamp: offsetDate(order.createdAt, 240),
        status: 'completed',
        color: 'tw-text-green-700 dark:tw-text-green-400',
        dotColor: 'tw-bg-green-500 dark:tw-bg-green-400',
        Icon: CheckCircle2,
      })
    }
  }

  return events
}

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

type TimelineItemProps = {
  event: TimelineEvent
  isLast: boolean
}

const TimelineItem = ({ event, isLast }: TimelineItemProps) => {
  const Icon = event.Icon

  return (
    <div className="tw-flex tw-gap-4">
      {/* Left column: dot + vertical line */}
      <div className="tw-flex tw-flex-col tw-items-center">
        <div
          className={cn(
            'tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2',
            event.status === 'completed'
              ? 'tw-border-transparent'
              : event.status === 'cancelled'
                ? 'tw-border-transparent'
                : 'tw-border-border tw-bg-background'
          )}
        >
          {event.status === 'completed' || event.status === 'cancelled' ? (
            <div
              className={cn(
                'tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-full',
                event.dotColor.replace('tw-bg-', 'tw-bg-') + '/20'
              )}
            >
              <Icon
                className={cn('tw-h-4 tw-w-4', event.color)}
                aria-hidden="true"
              />
            </div>
          ) : (
            <Circle
              className="tw-h-3 tw-w-3 tw-text-muted-foreground/40"
              aria-hidden="true"
            />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'tw-mt-1 tw-w-px tw-flex-1',
              event.status === 'completed' || event.status === 'cancelled'
                ? event.dotColor
                : 'tw-bg-border'
            )}
            style={{ minHeight: '2rem' }}
          />
        )}
      </div>

      {/* Right column: content */}
      <div className={cn('tw-min-w-0 tw-flex-1 tw-pb-6', isLast && 'tw-pb-0')}>
        <div className="tw-flex tw-flex-col tw-gap-0.5 sm:tw-flex-row sm:tw-items-center sm:tw-gap-3">
          <p
            className={cn(
              'tw-text-sm tw-font-semibold',
              event.status === 'pending'
                ? 'tw-text-muted-foreground'
                : 'tw-text-foreground'
            )}
          >
            {event.title}
          </p>
          {event.timestamp && (
            <span className="tw-text-xs tw-text-muted-foreground">
              {formatTimestamp(event.timestamp)}
            </span>
          )}
        </div>
        <p
          className={cn(
            'tw-mt-1 tw-text-sm',
            event.status === 'pending'
              ? 'tw-text-muted-foreground/60'
              : 'tw-text-muted-foreground'
          )}
        >
          {event.description}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderTimeline
// ---------------------------------------------------------------------------

type OrderTimelineProps = {
  order: Order
}

const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const events = buildTimeline(order)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw-text-base">Order Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="tw-space-y-0">
          {events.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default OrderTimeline
