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

import ProductRow from './ProductRow'
import type { Product } from './types'

type ProductTableProps = {
  products: Product[]
  selectedIds: Set<string>
  onSelectOne: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  loading?: boolean
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
  onView?: (product: Product) => void
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
          <div className="tw-flex tw-items-center tw-gap-3">
            <Skeleton className="tw-h-10 tw-w-10 tw-rounded-md" />
            <div className="tw-space-y-1.5">
              <Skeleton className="tw-h-4 tw-w-36" />
              <Skeleton className="tw-h-3 tw-w-20" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-5 tw-w-16 tw-rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-20" />
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
    <TableCell colSpan={7} className="tw-py-16 tw-text-center">
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
          />
        </svg>
        <p className="tw-text-sm tw-font-medium">No products found</p>
        <p className="tw-text-xs">
          Try adjusting your search or filter criteria
        </p>
      </div>
    </TableCell>
  </TableRow>
)

const ProductTable = ({
  products,
  selectedIds,
  onSelectOne,
  onSelectAll,
  loading = false,
  onEdit,
  onDelete,
  onView,
}: ProductTableProps) => {
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id))
  const someSelected =
    !allSelected && products.some((p) => selectedIds.has(p.id))

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
                aria-label="Select all products"
              />
            </TableHead>
            <TableHead className="tw-min-w-[220px]">Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="tw-w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton />
          ) : products.length === 0 ? (
            <EmptyState />
          ) : (
            products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onSelect={onSelectOne}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default ProductTable
