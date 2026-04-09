import { useMemo, useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import DeleteOrderDialog from 'src/components/Orders/DeleteOrderDialog'
import { MOCK_ORDER_STATS, MOCK_ORDERS } from 'src/components/Orders/mockData'
import OrderFilters from 'src/components/Orders/OrderFilters'
import OrderHeader from 'src/components/Orders/OrderHeader'
import OrderStatsCards from 'src/components/Orders/OrderStats'
import OrderTable from 'src/components/Orders/OrderTable'
import type {
  Order,
  OrderFiltersState,
  PaginationState,
} from 'src/components/Orders/types'
import Pagination from 'src/components/Products/Pagination'
import { Button } from 'src/components/ui/button'
import { useToast } from 'src/hooks/use-toast'

function applyFilters(orders: Order[], filters: OrderFiltersState): Order[] {
  return orders.filter((o) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matchesOrder = o.orderNumber.toLowerCase().includes(q)
      const matchesName = o.customer.name?.toLowerCase().includes(q)
      const matchesEmail = o.customer.email.toLowerCase().includes(q)
      if (!matchesOrder && !matchesName && !matchesEmail) return false
    }
    if (filters.status && filters.status !== 'All Statuses') {
      if (o.status !== filters.status) return false
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'All Payments') {
      if (o.paymentStatus !== filters.paymentStatus) return false
    }
    return true
  })
}

const OrdersPage = () => {
  const { toast } = useToast()

  const [filters, setFilters] = useState<OrderFiltersState>({
    search: '',
    status: 'All Statuses',
    paymentStatus: 'All Payments',
    dateRange: 'All Time',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filteredOrders = useMemo(
    () => applyFilters(MOCK_ORDERS, filters),
    [filters]
  )

  const paginatedOrders = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return filteredOrders.slice(start, start + pagination.pageSize)
  }, [filteredOrders, pagination.page, pagination.pageSize])

  const paginationWithTotal: PaginationState = {
    ...pagination,
    total: filteredOrders.length,
  }

  const handleFilterChange = (key: keyof OrderFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSelectedIds(new Set())
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(
      checked ? new Set(paginatedOrders.map((o) => o.id)) : new Set()
    )
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    setSelectedIds(new Set())
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ page: 1, pageSize, total: 0 })
    setSelectedIds(new Set())
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      console.log('Deleting order:', deleteTarget.id)
      await new Promise((r) => setTimeout(r, 600))
      toast({
        title: 'Order deleted',
        description: `${deleteTarget.orderNumber} has been removed.`,
      })
      setDeleteTarget(null)
    } catch {
      toast({
        title: 'Failed to delete order',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const selectedCount = selectedIds.size

  return (
    <>
      <Metadata
        title="Orders"
        description="Manage and track all customer orders"
        robots="nofollow"
      />

      <div className="tw-space-y-6">
        <OrderHeader
          onExport={() => console.log('Export orders')}
          onCreateOrder={() => navigate(routes.adminNewOrder())}
        />

        <OrderStatsCards stats={MOCK_ORDER_STATS} />

        {selectedCount > 0 && (
          <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-md tw-border tw-border-border tw-bg-card tw-px-4 tw-py-2">
            <span className="tw-text-sm tw-font-medium tw-text-foreground">
              {selectedCount} selected
            </span>
            <div className="tw-ml-auto tw-flex tw-items-center tw-gap-2">
              <Button variant="outline" size="sm">
                Export Selected
              </Button>
              <Button variant="destructive" size="sm">
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        <OrderFilters filters={filters} onFilterChange={handleFilterChange} />

        <OrderTable
          orders={paginatedOrders}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          onSelectAll={handleSelectAll}
          loading={false}
          onView={(o) => navigate(routes.adminOrder({ id: o.id }))}
          onDelete={(o) => setDeleteTarget(o)}
        />

        <Pagination
          pagination={paginationWithTotal}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <DeleteOrderDialog
        open={deleteTarget !== null}
        orderNumber={deleteTarget?.orderNumber}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  )
}

export default OrdersPage
