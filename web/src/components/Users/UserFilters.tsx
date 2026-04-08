import { Search } from 'lucide-react'

import { Input } from 'src/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select'

import { ROLE_OPTIONS, STATUS_OPTIONS, type UserFiltersState } from './types'

type UserFiltersProps = {
  filters: UserFiltersState
  onFilterChange: (key: keyof UserFiltersState, value: string) => void
}

const UserFilters = ({ filters, onFilterChange }: UserFiltersProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center">
      <div className="tw-relative tw-flex-1">
        <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 tw--translate-y-1/2 tw-text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="tw-pl-9"
        />
      </div>

      <div className="tw-flex tw-items-center tw-gap-2">
        <Select
          value={filters.role}
          onValueChange={(v) => onFilterChange('role', v)}
        >
          <SelectTrigger className="tw-w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
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
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default UserFilters
