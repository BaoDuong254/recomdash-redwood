import { Edit, Eye, MoreHorizontal, Trash2 } from 'lucide-react'

import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { Checkbox } from 'src/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import { TableCell, TableRow } from 'src/components/ui/table'
import { cn } from 'src/lib/utils'

import type { Product } from './types'

type ProductRowProps = {
  product: Product
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
  onView?: (product: Product) => void
}

const StatusBadge = ({ status }: { status: Product['status'] }) => {
  const variants: Record<
    Product['status'],
    { label: string; className: string }
  > = {
    active: {
      label: 'Active',
      className:
        'tw-bg-emerald-100 tw-text-emerald-700 hover:tw-bg-emerald-100 dark:tw-bg-emerald-900/30 dark:tw-text-emerald-400',
    },
    draft: {
      label: 'Draft',
      className:
        'tw-bg-muted tw-text-muted-foreground hover:tw-bg-muted dark:tw-bg-muted dark:tw-text-muted-foreground',
    },
    archived: {
      label: 'Archived',
      className:
        'tw-bg-red-100 tw-text-red-700 hover:tw-bg-red-100 dark:tw-bg-red-900/30 dark:tw-text-red-400',
    },
  }

  const { label, className } = variants[status] ?? variants.draft

  return (
    <Badge variant="secondary" className={cn('tw-font-medium', className)}>
      {label}
    </Badge>
  )
}

const InventoryCell = ({
  inventory,
  threshold,
}: {
  inventory: number
  threshold: number
}) => {
  const isOut = inventory === 0
  const isLow = !isOut && inventory <= threshold

  return (
    <div className="tw-flex tw-flex-col tw-gap-0.5">
      <span
        className={cn(
          'tw-text-sm tw-font-medium',
          isOut && 'tw-text-red-600 dark:tw-text-red-400',
          isLow && 'tw-text-orange-600 dark:tw-text-orange-400',
          !isOut && !isLow && 'tw-text-foreground'
        )}
      >
        {isOut ? 'Out of stock' : `${inventory} in stock`}
      </span>
      {isLow && (
        <span className="tw-text-xs tw-font-medium tw-text-orange-500">
          Low Stock
        </span>
      )}
    </div>
  )
}

const ProductRow = ({
  product,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onView,
}: ProductRowProps) => {
  return (
    <TableRow
      className={cn(
        'tw-group tw-transition-colors',
        selected && 'tw-bg-muted/50'
      )}
    >
      {/* Checkbox */}
      <TableCell className="tw-w-12">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(product.id, !!checked)}
          aria-label={`Select ${product.name}`}
        />
      </TableCell>

      {/* Product */}
      <TableCell>
        <div className="tw-flex tw-items-center tw-gap-3">
          <img
            src={product.image}
            alt={product.name}
            className="tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-md tw-border tw-border-border tw-object-cover"
          />
          <div className="tw-min-w-0">
            <p className="tw-truncate tw-text-sm tw-font-semibold tw-text-foreground">
              {product.name}
            </p>
            <p className="tw-text-xs tw-text-muted-foreground">{product.sku}</p>
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={product.status} />
      </TableCell>

      {/* Inventory */}
      <TableCell>
        <InventoryCell
          inventory={product.inventory}
          threshold={product.lowStockThreshold}
        />
      </TableCell>

      {/* Price */}
      <TableCell className="tw-text-sm tw-font-medium tw-text-foreground">
        ${product.price.toFixed(2)}
      </TableCell>

      {/* Category */}
      <TableCell className="tw-text-sm tw-text-muted-foreground">
        {product.category}
      </TableCell>

      {/* Actions */}
      <TableCell className="tw-w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tw-h-8 tw-w-8 tw-opacity-0 focus:tw-opacity-100 group-hover:tw-opacity-100"
              aria-label="Product actions"
            >
              <MoreHorizontal className="tw-h-4 tw-w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw-w-40">
            <DropdownMenuItem onClick={() => onView?.(product)}>
              <Eye className="tw-mr-2 tw-h-4 tw-w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(product)}>
              <Edit className="tw-mr-2 tw-h-4 tw-w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(product)}
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

export default ProductRow
