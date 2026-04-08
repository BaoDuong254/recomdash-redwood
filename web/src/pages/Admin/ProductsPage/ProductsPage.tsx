import { useMemo, useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import DeleteProductDialog from 'src/components/Products/DeleteProductDialog'
import { MOCK_PRODUCTS } from 'src/components/Products/mockData'
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

function applyFilters(
  products: Product[],
  filters: ProductFiltersState
): Product[] {
  return products.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q))
        return false
    }
    if (
      filters.category &&
      filters.category !== 'All Categories' &&
      p.category !== filters.category
    )
      return false
    if (
      filters.status &&
      filters.status !== 'All Statuses' &&
      p.status !== filters.status
    )
      return false
    if (filters.inventory && filters.inventory !== 'All Inventory') {
      if (filters.inventory === 'In Stock' && p.inventory === 0) return false
      if (
        filters.inventory === 'Low Stock' &&
        (p.inventory === 0 || p.inventory > p.lowStockThreshold)
      )
        return false
      if (filters.inventory === 'Out of Stock' && p.inventory !== 0)
        return false
    }
    return true
  })
}

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
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filteredProducts = useMemo(
    () => applyFilters(MOCK_PRODUCTS, filters),
    [filters]
  )
  const paginatedProducts = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return filteredProducts.slice(start, start + pagination.pageSize)
  }, [filteredProducts, pagination.page, pagination.pageSize])

  const paginationWithTotal: PaginationState = {
    ...pagination,
    total: filteredProducts.length,
  }

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
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(
      checked ? new Set(paginatedProducts.map((p) => p.id)) : new Set()
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
      console.log('Deleting product:', deleteTarget.id)
      await new Promise((r) => setTimeout(r, 600))
      toast({
        title: 'Product deleted',
        description: `"${deleteTarget.name}" has been removed from your catalog.`,
      })
      setDeleteTarget(null)
    } catch {
      toast({
        title: 'Failed to delete product',
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
        title="Product Management"
        description="Manage your product catalog, inventory, and pricing"
        robots="nofollow"
      />

      <div className="tw-space-y-6">
        <ProductHeader
          onExport={() => console.log('Export')}
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
          products={paginatedProducts}
          selectedIds={selectedIds}
          onSelectOne={handleSelectOne}
          onSelectAll={handleSelectAll}
          loading={false}
          onView={(p) => navigate(routes.adminProduct({ id: p.id }))}
          onEdit={(p) => navigate(routes.adminEditProduct({ id: p.id }))}
          onDelete={(p) => setDeleteTarget(p)}
        />

        <Pagination
          pagination={paginationWithTotal}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
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
