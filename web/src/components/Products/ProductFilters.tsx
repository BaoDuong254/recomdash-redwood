import { Search, SlidersHorizontal } from 'lucide-react'

import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select'

import { CATEGORY_OPTIONS, INVENTORY_OPTIONS, STATUS_OPTIONS } from './mockData'
import type { ProductFiltersState } from './types'

type ProductFiltersProps = {
  filters: ProductFiltersState
  onFilterChange: (key: keyof ProductFiltersState, value: string) => void
}

const ProductFilters = ({ filters, onFilterChange }: ProductFiltersProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
      {/* Search */}
      <div className="tw-relative tw-flex-1">
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 tw--translate-y-1/2 tw-text-muted-foreground" />
        <Input
          placeholder="Search products by name, SKU..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="tw-pl-9"
        />
      </div>

      {/* Filters */}
      <div className="tw-flex tw-items-center tw-gap-2">
        <Select
          value={filters.category}
          onValueChange={(v) => onFilterChange('category', v)}
        >
          <SelectTrigger className="tw-w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(v) => onFilterChange('status', v)}
        >
          <SelectTrigger className="tw-w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'active'
                  ? 'Active'
                  : opt === 'draft'
                    ? 'Draft'
                    : opt === 'archived'
                      ? 'Archived'
                      : opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.inventory}
          onValueChange={(v) => onFilterChange('inventory', v)}
        >
          <SelectTrigger className="tw-w-[150px]">
            <SelectValue placeholder="Inventory" />
          </SelectTrigger>
          <SelectContent>
            {INVENTORY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" aria-label="More filters">
          <SlidersHorizontal className="tw-h-4 tw-w-4" />
        </Button>
      </div>
    </div>
  )
}

export default ProductFilters
