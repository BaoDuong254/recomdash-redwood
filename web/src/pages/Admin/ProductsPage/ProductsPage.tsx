import { useEffect, useState } from 'react'

import { useLazyQuery } from '@apollo/client'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DeleteProductDialog from 'src/components/Products/DeleteProductDialog'
import Pagination from 'src/components/Products/Pagination'
import ProductFilters from 'src/components/Products/ProductFilters'
import ProductHeader from 'src/components/Products/ProductHeader'
import ProductTable from 'src/components/Products/ProductTable'
import type {
  PaginationState,
  Product,
  ProductFiltersState,
} from 'src/components/Products/types'
import { Button } from 'src/components/ui/button'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY = gql`
  query ProductsPageQuery(
    $page: Int
    $pageSize: Int
    $search: String
    $category: String
    $status: String
    $inventoryFilter: String
  ) {
    products(
      page: $page
      pageSize: $pageSize
      search: $search
      category: $category
      status: $status
      inventoryFilter: $inventoryFilter
    ) {
      products {
        id
        name
        sku
        price
        inventory
        lowStockThreshold
        status
        category
        image
        description
      }
      total
    }
  }
`

const EXPORT_PRODUCTS_QUERY = gql`
  query ExportProductsQuery(
    $search: String
    $category: String
    $status: String
    $inventoryFilter: String
  ) {
    exportProducts(
      search: $search
      category: $category
      status: $status
      inventoryFilter: $inventoryFilter
    ) {
      name
      sku
      price
      category
      status
      inventory
      lowStockThreshold
      createdAt
      updatedAt
    }
  }
`

const DELETE_PRODUCT_MUTATION = gql`
  mutation DeleteProductFromListMutation($id: String!) {
    deleteProduct(id: $id) {
      id
      name
    }
  }
`

// ---------------------------------------------------------------------------
// CSV export helpers
// ---------------------------------------------------------------------------

type ExportProduct = {
  name: string
  sku: string
  price: number
  category: string
  status: string
  inventory: number
  lowStockThreshold: number
  createdAt: string
  updatedAt: string
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
}

function generateCsv(products: ExportProduct[]): string {
  const header = toCsvRow([
    'Name',
    'SKU',
    'Price',
    'Category',
    'Status',
    'Inventory',
    'Low Stock Threshold',
    'Created At',
    'Updated At',
  ])
  const rows = products.map((p) =>
    toCsvRow([
      p.name,
      p.sku,
      p.price.toFixed(2),
      p.category,
      p.status,
      p.inventory,
      p.lowStockThreshold,
      new Date(p.createdAt).toISOString(),
      new Date(p.updatedAt).toISOString(),
    ])
  )
  return [header, ...rows].join('\n')
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

const ProductsPage = () => {
  const { toast } = useToast()

  const [filters, setFilters] = useState<ProductFiltersState>({
    search: '',
    category: 'All Categories',
    status: 'All Statuses',
    inventory: 'All Inventory',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const debouncedSearch = useDebounce(filters.search, 400)
  const [exportLoading, setExportLoading] = useState(false)

  const queryVariables = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: debouncedSearch || null,
    category: filters.category !== 'All Categories' ? filters.category : null,
    status: filters.status !== 'All Statuses' ? filters.status : null,
    inventoryFilter:
      filters.inventory !== 'All Inventory' ? filters.inventory : null,
  }

  const exportFilterVariables = {
    search: debouncedSearch || null,
    category: filters.category !== 'All Categories' ? filters.category : null,
    status: filters.status !== 'All Statuses' ? filters.status : null,
    inventoryFilter:
      filters.inventory !== 'All Inventory' ? filters.inventory : null,
  }

  const [runExportQuery] = useLazyQuery(EXPORT_PRODUCTS_QUERY)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const { data: exportData, error } = await runExportQuery({
        variables: exportFilterVariables,
      })
      if (error) throw error
      const products: ExportProduct[] = exportData?.exportProducts ?? []
      if (products.length === 0) {
        toast({ title: 'No products to export' })
        return
      }
      const csv = generateCsv(products)
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(csv, `products-${date}.csv`)
      toast({
        title: 'Export complete',
        description: `${products.length} products exported to CSV.`,
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

  const { data, loading } = useQuery(PRODUCTS_QUERY, {
    variables: queryVariables,
    onError: (error) => {
      toast({
        title: 'Failed to load products',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [deleteProduct, { loading: deleteLoading }] = useMutation(
    DELETE_PRODUCT_MUTATION,
    {
      onCompleted: ({ deleteProduct: deleted }) => {
        toast({
          title: 'Product deleted',
          description: `"${deleted.name}" has been removed from your catalog.`,
        })
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete product',
          description: error.message,
          variant: 'destructive',
        })
      },
      refetchQueries: [{ query: PRODUCTS_QUERY, variables: queryVariables }],
    }
  )

  // Sync total from query result into pagination state
  const total = data?.products?.total ?? pagination.total
  useEffect(() => {
    if (
      data?.products?.total !== undefined &&
      data.products.total !== pagination.total
    ) {
      setPagination((prev) => ({ ...prev, total: data.products.total }))
    }
  }, [data?.products?.total]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (
    key: keyof ProductFiltersState,
    value: string
  ) => {
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
    const pageProducts: Product[] = data?.products?.products ?? []
    setSelectedIds(
      checked ? new Set(pageProducts.map((p: Product) => p.id)) : new Set()
    )
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteProduct({ variables: { id: deleteTarget.id } })
  }

  const pageProducts: Product[] = data?.products?.products ?? []
  const selectedCount = selectedIds.size

  return (
    <>
      <Metadata
        title="Product Management"
        description="Manage your product catalog, inventory, and pricing"
        robots="nofollow"
      />

      <div className="tw-space-y-6">
        <ProductHeader
          onExport={handleExport}
          exportLoading={exportLoading}
          onAddProduct={() => navigate(routes.adminNewProduct())}
        />

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

        <ProductFilters filters={filters} onFilterChange={handleFilterChange} />

        <ProductTable
          products={pageProducts}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          onSelectAll={handleSelectAll}
          loading={loading}
          onView={(p) => navigate(routes.adminProduct({ id: p.id }))}
          onEdit={(p) => navigate(routes.adminEditProduct({ id: p.id }))}
          onDelete={(p) => setDeleteTarget(p)}
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

      <DeleteProductDialog
        open={deleteTarget !== null}
        productName={deleteTarget?.name}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  )
}

export default ProductsPage
