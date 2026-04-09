import { useEffect, useState } from 'react'

import { useLazyQuery } from '@apollo/client'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DeleteOrderDialog from 'src/components/Orders/DeleteOrderDialog'
import OrderFilters from 'src/components/Orders/OrderFilters'
import OrderHeader from 'src/components/Orders/OrderHeader'
import OrderStatsCards from 'src/components/Orders/OrderStats'
import OrderTable from 'src/components/Orders/OrderTable'
import type {
  Order,
  OrderFiltersState,
  OrderStats,
  PaginationState,
} from 'src/components/Orders/types'
import Pagination from 'src/components/Products/Pagination'
import { Button } from 'src/components/ui/button'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const ORDERS_QUERY = gql`
  query OrdersPageQuery(
    $page: Int
    $pageSize: Int
    $search: String
    $status: OrderStatus
    $paymentStatus: PaymentStatus
  ) {
    orders(
      page: $page
      pageSize: $pageSize
      search: $search
      status: $status
      paymentStatus: $paymentStatus
    ) {
      orders {
        id
        orderNumber
        status
        paymentStatus
        fulfillmentStatus
        totalAmount
        createdAt
        customer {
          id
          name
          email
          avatarUrl
        }
      }
      total
    }
    orderStats {
      total
      new
      paid
      fulfilled
      cancelled
    }
  }
`

const EXPORT_ORDERS_QUERY = gql`
  query ExportOrdersQuery(
    $search: String
    $status: OrderStatus
    $paymentStatus: PaymentStatus
  ) {
    exportOrders(
      search: $search
      status: $status
      paymentStatus: $paymentStatus
    ) {
      orderNumber
      totalAmount
      createdAt
      customer {
        name
        email
      }
      status
      paymentStatus
      fulfillmentStatus
    }
  }
`

const DELETE_ORDER_MUTATION = gql`
  mutation DeleteOrderFromListMutation($id: String!) {
    deleteOrder(id: $id) {
      id
      orderNumber
    }
  }
`

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

type ExportRow = {
  orderNumber: string
  customer: { name: string | null; email: string }
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  totalAmount: number
  createdAt: string
}

function toCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(toCsvCell).join(',')
}

function generateOrdersCsv(rows: ExportRow[]): string {
  const header = toCsvRow([
    'Order #',
    'Customer Name',
    'Email',
    'Status',
    'Payment',
    'Fulfillment',
    'Total',
    'Date',
  ])
  const dataRows = rows.map((o) =>
    toCsvRow([
      o.orderNumber,
      o.customer?.name ?? '',
      o.customer?.email ?? '',
      o.status,
      o.paymentStatus,
      o.fulfillmentStatus,
      o.totalAmount.toFixed(2),
      new Date(o.createdAt).toISOString(),
    ])
  )
  return [header, ...dataRows].join('\n')
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  const debouncedSearch = useDebounce(filters.search, 400)
  const [exportLoading, setExportLoading] = useState(false)

  const queryVariables = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: debouncedSearch || null,
    status:
      filters.status !== 'All Statuses'
        ? (filters.status as Order['status'])
        : null,
    paymentStatus:
      filters.paymentStatus !== 'All Payments'
        ? (filters.paymentStatus as Order['paymentStatus'])
        : null,
  }

  const exportFilterVariables = {
    search: debouncedSearch || null,
    status:
      filters.status !== 'All Statuses'
        ? (filters.status as Order['status'])
        : null,
    paymentStatus:
      filters.paymentStatus !== 'All Payments'
        ? (filters.paymentStatus as Order['paymentStatus'])
        : null,
  }

  const [runExportQuery] = useLazyQuery(EXPORT_ORDERS_QUERY)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const { data: exportData, error } = await runExportQuery({
        variables: exportFilterVariables,
      })
      if (error) throw error
      const rows: ExportRow[] = exportData?.exportOrders ?? []
      if (rows.length === 0) {
        toast({ title: 'No orders to export' })
        return
      }
      const csv = generateOrdersCsv(rows)
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(csv, `orders-${date}.csv`)
      toast({
        title: 'Export complete',
        description: `${rows.length} orders exported to CSV.`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setExportLoading(false)
    }
  }

  const { data, loading } = useQuery(ORDERS_QUERY, {
    variables: queryVariables,
    onError: (error) => {
      toast({
        title: 'Failed to load orders',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [deleteOrder, { loading: deleteLoading }] = useMutation(
    DELETE_ORDER_MUTATION,
    {
      onCompleted: ({ deleteOrder: deleted }) => {
        toast({
          title: 'Order deleted',
          description: `${deleted.orderNumber} has been removed.`,
        })
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete order',
          description: error.message,
          variant: 'destructive',
        })
      },
      refetchQueries: [{ query: ORDERS_QUERY, variables: queryVariables }],
    }
  )

  // Sync total from query into pagination state
  useEffect(() => {
    if (
      data?.orders?.total !== undefined &&
      data.orders.total !== pagination.total
    ) {
      setPagination((prev) => ({ ...prev, total: data.orders.total }))
    }
  }, [data?.orders?.total]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const pageOrders: Order[] = data?.orders?.orders ?? []
    setSelectedIds(
      checked ? new Set(pageOrders.map((o: Order) => o.id)) : new Set()
    )
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteOrder({ variables: { id: deleteTarget.id } })
  }

  const pageOrders: Order[] = data?.orders?.orders ?? []
  const total = data?.orders?.total ?? pagination.total
  const stats: OrderStats = data?.orderStats ?? {
    total: 0,
    new: 0,
    paid: 0,
    fulfilled: 0,
    cancelled: 0,
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
          onExport={handleExport}
          exportLoading={exportLoading}
          onCreateOrder={() => navigate(routes.adminNewOrder())}
        />

        <OrderStatsCards stats={stats} />

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
          orders={pageOrders}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          onSelectAll={handleSelectAll}
          loading={loading}
          onView={(o) => navigate(routes.adminOrder({ id: o.id }))}
          onDelete={(o) => setDeleteTarget(o)}
        />

        <Pagination
          pagination={{ ...pagination, total }}
          onPageChange={(page) => {
            setPagination((prev) => ({ ...prev, page }))
            setSelectedIds(new Set())
          }}
          onPageSizeChange={(pageSize) => {
            setPagination({ page: 1, pageSize, total })
            setSelectedIds(new Set())
          }}
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
