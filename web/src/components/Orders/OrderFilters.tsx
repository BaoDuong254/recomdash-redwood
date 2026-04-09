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

import {
  DATE_OPTIONS,
  PAYMENT_OPTIONS,
  STATUS_OPTIONS,
  type OrderFiltersState,
} from './types'

type OrderFiltersProps = {
  filters: OrderFiltersState
  onFilterChange: (key: keyof OrderFiltersState, value: string) => void
}

const OrderFilters = ({ filters, onFilterChange }: OrderFiltersProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
      {/* Search */}
      <div className="tw-relative tw-flex-1">
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 tw--translate-y-1/2 tw-text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="tw-pl-9"
        />
      </div>

      {/* Filters */}
      <div className="tw-flex tw-items-center tw-gap-2">
        <Select
          value={filters.status}
          onValueChange={(v) => onFilterChange('status', v)}
        >
          <SelectTrigger className="tw-w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentStatus}
          onValueChange={(v) => onFilterChange('paymentStatus', v)}
        >
          <SelectTrigger className="tw-w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange}
          onValueChange={(v) => onFilterChange('dateRange', v)}
        >
          <SelectTrigger className="tw-w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
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

export default OrderFilters
