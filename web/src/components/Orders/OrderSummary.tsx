import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'
import { Separator } from 'src/components/ui/separator'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from 'src/components/ui/status-badge'

import type { Order, OrderCustomer } from './types'

// ---------------------------------------------------------------------------
// Customer avatar
// ---------------------------------------------------------------------------

function getInitials(customer: OrderCustomer): string {
  if (customer?.name) {
    const computed = customer.name
      .split(' ')
      .map((n) => n?.[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return computed || 'U'
  }
  if (customer?.email) {
    return customer.email[0]?.toUpperCase() || 'U'
  }
  return 'U'
}

const CustomerAvatar = ({ customer }: { customer: OrderCustomer }) => {
  const initials = getInitials(customer)
  const altText = customer?.name || customer?.email || 'Customer'

  if (customer?.avatarUrl) {
    return (
      <img
        src={customer.avatarUrl}
        alt={altText}
        className="tw-h-12 tw-w-12 tw-shrink-0 tw-rounded-full tw-border tw-border-border tw-object-cover"
      />
    )
  }

  return (
    <div className="tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-primary/10 tw-text-base tw-font-semibold tw-text-primary">
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View field
// ---------------------------------------------------------------------------

const ViewField = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="tw-space-y-1">
    <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
      {label}
    </p>
    <div className="tw-text-sm tw-font-medium tw-text-foreground">
      {value ?? '—'}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Items table
// ---------------------------------------------------------------------------

const OrderItemsTable = ({ order }: { order: Order }) => {
  const items = order.items ?? []
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const tax = subtotal * 0.1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw-text-base">Order Items</CardTitle>
      </CardHeader>
      <CardContent className="tw-p-0">
        {items.length === 0 ? (
          <p className="tw-px-6 tw-py-8 tw-text-center tw-text-sm tw-text-muted-foreground">
            No items on this order.
          </p>
        ) : (
          <div className="tw-overflow-x-auto">
            <table className="tw-w-full tw-text-sm">
              <thead>
                <tr className="tw-border-b tw-border-border">
                  <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
                    Product
                  </th>
                  <th className="tw-px-4 tw-py-3 tw-text-right tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
                    Price
                  </th>
                  <th className="tw-px-4 tw-py-3 tw-text-right tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
                    Qty
                  </th>
                  <th className="tw-px-6 tw-py-3 tw-text-right tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="tw-divide-y tw-divide-border">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="tw-transition-colors hover:tw-bg-muted/40"
                  >
                    <td className="tw-px-6 tw-py-4 tw-font-medium tw-text-foreground">
                      {item.name}
                    </td>
                    <td className="tw-px-4 tw-py-4 tw-text-right tw-text-muted-foreground">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="tw-px-4 tw-py-4 tw-text-right tw-text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="tw-px-6 tw-py-4 tw-text-right tw-font-semibold tw-text-foreground">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pricing summary */}
            <div className="tw-border-t tw-border-border tw-px-6 tw-py-4">
              <div className="tw-ml-auto tw-w-full tw-max-w-xs tw-space-y-2">
                <div className="tw-flex tw-justify-between tw-text-sm tw-text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="tw-flex tw-justify-between tw-text-sm tw-text-muted-foreground">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="tw-flex tw-justify-between tw-text-base tw-font-bold tw-text-foreground">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// OrderSummary — header card with customer + status info
// ---------------------------------------------------------------------------

type OrderSummaryProps = {
  order: Order
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="tw-space-y-4">
      {/* Overview card */}
      <Card>
        <CardHeader>
          <CardTitle className="tw-text-base">Order Overview</CardTitle>
        </CardHeader>
        <CardContent className="tw-space-y-6">
          {/* Customer row */}
          <div className="tw-flex tw-items-center tw-gap-4">
            <CustomerAvatar customer={order.customer} />
            <div className="tw-min-w-0">
              <p className="tw-text-base tw-font-semibold tw-text-foreground">
                {order.customer.name ?? '—'}
              </p>
              <p className="tw-text-sm tw-text-muted-foreground">
                {order.customer.email || '—'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Meta grid */}
          <div className="tw-grid tw-grid-cols-2 tw-gap-4 sm:tw-grid-cols-4">
            <ViewField label="Order ID" value={order.orderNumber} />
            <ViewField label="Date" value={`${date} at ${time}`} />
            <ViewField
              label="Total"
              value={
                <span className="tw-text-base tw-font-bold">
                  ${order.totalAmount.toFixed(2)}
                </span>
              }
            />
            <ViewField
              label="Items"
              value={`${order.items?.length ?? 0} item(s)`}
            />
          </div>

          <Separator />

          {/* Status badges */}
          <div className="tw-grid tw-grid-cols-2 tw-gap-4 sm:tw-grid-cols-3">
            <ViewField
              label="Order Status"
              value={<OrderStatusBadge status={order.status} />}
            />
            <ViewField
              label="Payment"
              value={<PaymentStatusBadge status={order.paymentStatus} />}
            />
            <ViewField
              label="Fulfillment"
              value={
                order.fulfillmentStatus === 'FULFILLED' ? (
                  <span className="tw-text-sm tw-font-medium tw-text-green-700 dark:tw-text-green-400">
                    Fulfilled
                  </span>
                ) : (
                  <span className="tw-text-sm tw-text-muted-foreground">
                    Unfulfilled
                  </span>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <OrderItemsTable order={order} />
    </div>
  )
}

export default OrderSummary
