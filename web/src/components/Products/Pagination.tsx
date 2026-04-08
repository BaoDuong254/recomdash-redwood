import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from 'src/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select'
import { cn } from 'src/lib/utils'

import type { PaginationState } from './types'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

type PaginationProps = {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const Pagination = ({
  pagination,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const { page, pageSize, total } = pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  // Generate page numbers to show (up to 5 around current page)
  const getPageNumbers = () => {
    const delta = 2
    const range: (number | 'ellipsis')[] = []
    const left = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)

    if (left > 1) {
      range.push(1)
      if (left > 2) range.push('ellipsis')
    }
    for (let i = left; i <= right; i++) range.push(i)
    if (right < totalPages) {
      if (right < totalPages - 1) range.push('ellipsis')
      range.push(totalPages)
    }
    return range
  }

  return (
    <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      {/* Results info */}
      <p className="tw-text-sm tw-text-muted-foreground">
        {total === 0
          ? 'No results'
          : `Showing ${start}–${end} of ${total} results`}
      </p>

      <div className="tw-flex tw-items-center tw-gap-4">
        {/* Page size selector */}
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-text-sm tw-text-muted-foreground">
            Rows per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="tw-h-8 tw-w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page controls */}
        <div className="tw-flex tw-items-center tw-gap-1">
          <Button
            variant="outline"
            size="icon"
            className="tw-h-8 tw-w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="tw-h-4 tw-w-4" />
          </Button>

          {getPageNumbers().map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="tw-px-1 tw-text-sm tw-text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'outline'}
                size="icon"
                className={cn('tw-h-8 tw-w-8 tw-text-sm')}
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="tw-h-8 tw-w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="tw-h-4 tw-w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Pagination
