import { Checkbox } from 'src/components/ui/checkbox'
import { Skeleton } from 'src/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table'

import OrderRow from './OrderRow'
import type { Order } from './types'

type OrderTableProps = {
  orders: Order[]
  selectedIds: Set<string>
  onSelectOne: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  loading?: boolean
  onView?: (order: Order) => void
  onDelete?: (order: Order) => void
}

const LOADING_ROWS = 5

const TableSkeleton = () => (
  <>
    {Array.from({ length: LOADING_ROWS }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-4" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-28" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-24" />
        </TableCell>
        <TableCell>
          <div className="tw-flex tw-items-center tw-gap-3">
            <Skeleton className="tw-h-9 tw-w-9 tw-rounded-full" />
            <div className="tw-space-y-1.5">
              <Skeleton className="tw-h-4 tw-w-32" />
              <Skeleton className="tw-h-3 tw-w-40" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-5 tw-w-16 tw-rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-5 tw-w-16 tw-rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-8 tw-w-8 tw-rounded-md" />
        </TableCell>
      </TableRow>
    ))}
  </>
)

const EmptyState = () => (
  <TableRow>
    <TableCell colSpan={9} className="tw-py-16 tw-text-center">
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="tw-h-10 tw-w-10 tw-opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <p className="tw-text-sm tw-font-medium">No orders found</p>
        <p className="tw-text-xs">
          Try adjusting your search or filter criteria
        </p>
      </div>
    </TableCell>
  </TableRow>
)

const OrderTable = ({
  orders,
  selectedIds,
  onSelectOne,
  onSelectAll,
  loading = false,
  onView,
  onDelete,
}: OrderTableProps) => {
  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o.id))
  const someSelected = !allSelected && orders.some((o) => selectedIds.has(o.id))

  return (
    <div className="tw-rounded-md tw-border tw-border-border tw-bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:tw-bg-transparent">
            <TableHead className="tw-w-12">
              <Checkbox
                checked={allSelected}
                data-state={someSelected ? 'indeterminate' : undefined}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label="Select all orders"
              />
            </TableHead>
            <TableHead className="tw-min-w-[140px]">Order ID</TableHead>
            <TableHead className="tw-min-w-[120px]">Date</TableHead>
            <TableHead className="tw-min-w-[220px]">Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Fulfillment</TableHead>
            <TableHead className="tw-text-right">Total</TableHead>
            <TableHead className="tw-w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton />
          ) : orders.length === 0 ? (
            <EmptyState />
          ) : (
            orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selected={selectedIds.has(order.id)}
                onSelect={onSelectOne}
                onView={onView}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default OrderTable
