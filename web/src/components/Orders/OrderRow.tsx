import { Eye, MoreHorizontal, Trash2 } from 'lucide-react'

import { Button } from 'src/components/ui/button'
import { Checkbox } from 'src/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from 'src/components/ui/status-badge'
import { TableCell, TableRow } from 'src/components/ui/table'
import { cn } from 'src/lib/utils'

import type { Order, OrderCustomer } from './types'

const CustomerAvatar = ({ customer }: { customer: OrderCustomer }) => {
  const initials = customer.name
    ? customer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : customer.email[0].toUpperCase()

  if (customer.avatarUrl) {
    return (
      <img
        src={customer.avatarUrl}
        alt={customer.name ?? customer.email}
        className="tw-h-9 tw-w-9 tw-shrink-0 tw-rounded-full tw-border tw-border-border tw-object-cover"
      />
    )
  }

  return (
    <div className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-primary/10 tw-text-sm tw-font-semibold tw-text-primary">
      {initials}
    </div>
  )
}

type OrderRowProps = {
  order: Order
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onView?: (order: Order) => void
  onDelete?: (order: Order) => void
}

const OrderRow = ({
  order,
  selected,
  onSelect,
  onView,
  onDelete,
}: OrderRowProps) => {
  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <TableRow
      className={cn(
        'tw-group tw-cursor-pointer tw-transition-colors',
        selected && 'tw-bg-muted/50'
      )}
      onClick={() => onView?.(order)}
    >
      {/* Checkbox — stop propagation so clicking checkbox doesn't navigate */}
      <TableCell className="tw-w-12" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(order.id, !!checked)}
          aria-label={`Select order ${order.orderNumber}`}
        />
      </TableCell>

      {/* Order ID */}
      <TableCell className="tw-font-mono tw-text-sm tw-font-medium tw-text-foreground">
        {order.orderNumber}
      </TableCell>

      {/* Date */}
      <TableCell className="tw-text-sm tw-text-muted-foreground">
        {date}
      </TableCell>

      {/* Customer */}
      <TableCell>
        <div className="tw-flex tw-items-center tw-gap-3">
          <CustomerAvatar customer={order.customer} />
          <div className="tw-min-w-0">
            <p className="tw-truncate tw-text-sm tw-font-semibold tw-text-foreground">
              {order.customer.name ?? '—'}
            </p>
            <p className="tw-truncate tw-text-xs tw-text-muted-foreground">
              {order.customer.email}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <OrderStatusBadge status={order.status} />
      </TableCell>

      {/* Payment */}
      <TableCell>
        <PaymentStatusBadge status={order.paymentStatus} />
      </TableCell>

      {/* Fulfillment */}
      <TableCell className="tw-text-sm tw-text-muted-foreground">
        {order.fulfillmentStatus === 'FULFILLED' ? (
          <span className="tw-font-medium tw-text-green-700 dark:tw-text-green-400">
            Fulfilled
          </span>
        ) : (
          <span>Unfulfilled</span>
        )}
      </TableCell>

      {/* Total */}
      <TableCell className="tw-text-right tw-text-sm tw-font-semibold tw-text-foreground">
        ${order.totalAmount.toFixed(2)}
      </TableCell>

      {/* Actions */}
      <TableCell className="tw-w-12" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tw-h-8 tw-w-8 tw-opacity-0 focus:tw-opacity-100 group-hover:tw-opacity-100"
              aria-label="Order actions"
            >
              <MoreHorizontal className="tw-h-4 tw-w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw-w-40">
            <DropdownMenuItem onClick={() => onView?.(order)}>
              <Eye className="tw-mr-2 tw-h-4 tw-w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(order)}
              className="tw-text-destructive focus:tw-text-destructive"
            >
              <Trash2 className="tw-mr-2 tw-h-4 tw-w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export { CustomerAvatar }
export default OrderRow
