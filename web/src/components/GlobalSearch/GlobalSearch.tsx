import { useCallback, useEffect, useRef, useState } from 'react'

import { useLazyQuery } from '@apollo/client'
import { Box, Loader2, Package, Search, ShoppingCart, X } from 'lucide-react'

import { navigate, routes } from '@redwoodjs/router'

import { Input } from 'src/components/ui/input'
import { cn } from 'src/lib/utils'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const GLOBAL_SEARCH_QUERY = gql`
  query GlobalSearchQuery($query: String!) {
    globalSearch(query: $query) {
      products {
        id
        name
        sku
        category
        price
        status
      }
      orders {
        id
        orderNumber
        customerName
        customerEmail
        status
        totalAmount
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductResult = {
  id: string
  name: string
  sku: string
  category: string
  price: number
  status: string
}

type OrderResult = {
  id: string
  orderNumber: string
  customerName: string | null
  customerEmail: string | null
  status: string
  totalAmount: number
}

type SearchResults = {
  products: ProductResult[]
  orders: OrderResult[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: 'tw-text-purple-600 dark:tw-text-purple-400',
  PAID: 'tw-text-blue-600 dark:tw-text-blue-400',
  FULFILLED: 'tw-text-green-600 dark:tw-text-green-400',
  CANCELLED: 'tw-text-red-500 dark:tw-text-red-400',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ResultItem = ({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-md tw-px-3 tw-py-2.5',
      'tw-text-left tw-transition-colors',
      'hover:tw-bg-accent focus-visible:tw-bg-accent',
      'focus-visible:tw-outline-none'
    )}
  >
    {children}
  </button>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="tw-mb-1 tw-px-3 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
    {children}
  </p>
)

const Divider = () => (
  <div className="tw-my-2 tw-h-px tw-bg-border" role="separator" />
)

// ---------------------------------------------------------------------------
// Dropdown panel
// ---------------------------------------------------------------------------

type DropdownProps = {
  query: string
  loading: boolean
  results: SearchResults | null
  onClose: () => void
}

const SearchDropdown = ({
  query,
  loading,
  results,
  onClose,
}: DropdownProps) => {
  const hasProducts = (results?.products.length ?? 0) > 0
  const hasOrders = (results?.orders.length ?? 0) > 0
  const hasAny = hasProducts || hasOrders
  const searched = query.trim().length >= 2

  const goToProduct = (id: string) => {
    navigate(routes.adminProduct({ id }))
    onClose()
  }

  const goToOrder = (id: string) => {
    navigate(routes.adminOrder({ id }))
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-label="Search results"
      className={cn(
        'tw-absolute tw-left-0 tw-top-full tw-z-50 tw-mt-1',
        'tw-w-full tw-min-w-[360px]',
        'tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-2 tw-shadow-lg',
        'tw-max-h-[420px] tw-overflow-y-auto'
      )}
    >
      {/* Loading */}
      {loading && (
        <div className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-6 tw-text-sm tw-text-muted-foreground">
          <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
          Searching…
        </div>
      )}

      {/* No results */}
      {!loading && searched && !hasAny && (
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-1.5 tw-py-6 tw-text-center">
          <Box className="tw-h-8 tw-w-8 tw-text-muted-foreground/40" />
          <p className="tw-text-sm tw-font-medium tw-text-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="tw-text-xs tw-text-muted-foreground">
            Try a different search term.
          </p>
        </div>
      )}

      {/* Query too short */}
      {!loading && !searched && (
        <p className="tw-py-4 tw-text-center tw-text-xs tw-text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      )}

      {/* Products */}
      {!loading && hasProducts && (
        <div>
          <SectionLabel>Products</SectionLabel>
          {results!.products.map((p) => (
            <ResultItem key={p.id} onClick={() => goToProduct(p.id)}>
              <div className="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-bg-primary/10">
                <Package className="tw-h-4 tw-w-4 tw-text-primary" />
              </div>
              <div className="tw-min-w-0 tw-flex-1">
                <p className="tw-truncate tw-text-sm tw-font-medium tw-text-foreground">
                  {p.name}
                </p>
                <p className="tw-truncate tw-text-xs tw-text-muted-foreground">
                  {p.sku} &middot; {p.category} &middot;{' '}
                  <span className="tw-capitalize">{p.status}</span>
                </p>
              </div>
              <span className="tw-shrink-0 tw-text-sm tw-font-semibold tw-tabular-nums tw-text-foreground">
                ${p.price.toFixed(2)}
              </span>
            </ResultItem>
          ))}
        </div>
      )}

      {/* Divider between sections */}
      {!loading && hasProducts && hasOrders && <Divider />}

      {/* Orders */}
      {!loading && hasOrders && (
        <div>
          <SectionLabel>Orders</SectionLabel>
          {results!.orders.map((o) => (
            <ResultItem key={o.id} onClick={() => goToOrder(o.id)}>
              <div className="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-bg-primary/10">
                <ShoppingCart className="tw-h-4 tw-w-4 tw-text-primary" />
              </div>
              <div className="tw-min-w-0 tw-flex-1">
                <p className="tw-truncate tw-text-sm tw-font-medium tw-text-foreground">
                  {o.orderNumber}
                </p>
                <p className="tw-truncate tw-text-xs tw-text-muted-foreground">
                  {o.customerName ?? o.customerEmail ?? 'Unknown customer'}
                </p>
              </div>
              <span
                className={cn(
                  'tw-shrink-0 tw-text-xs tw-font-semibold tw-uppercase',
                  ORDER_STATUS_COLORS[o.status] ?? 'tw-text-muted-foreground'
                )}
              >
                {o.status}
              </span>
            </ResultItem>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const GlobalSearch = () => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query, 350)

  const [runSearch, { data, loading }] = useLazyQuery(GLOBAL_SEARCH_QUERY)

  // Fire query whenever debounced value changes and has enough chars
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      runSearch({ variables: { query: debouncedQuery.trim() } })
    }
  }, [debouncedQuery, runSearch])

  // Open dropdown when user starts typing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleClear = () => {
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
  }

  const results: SearchResults | null = data?.globalSearch ?? null
  const showDropdown = open && query.length > 0

  return (
    <div ref={containerRef} className="tw-relative tw-w-full tw-max-w-sm">
      {/* Input */}
      <Search
        className="tw-pointer-events-none tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 tw--translate-y-1/2 tw-text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length > 0 && setOpen(true)}
        placeholder="Search products, orders…"
        className="tw-h-9 tw-pl-9 tw-pr-8"
        aria-label="Global search"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            'tw-absolute tw-right-2.5 tw-top-1/2 tw--translate-y-1/2',
            'tw-rounded tw-p-0.5 tw-text-muted-foreground',
            'hover:tw-text-foreground focus-visible:tw-outline-none focus-visible:tw-ring-1 focus-visible:tw-ring-ring'
          )}
        >
          <X className="tw-h-3.5 tw-w-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <SearchDropdown
          query={query}
          loading={loading}
          results={results}
          onClose={handleClose}
        />
      )}
    </div>
  )
}

export default GlobalSearch
