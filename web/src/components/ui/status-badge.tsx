/**
 * Centralized semantic badge variants for the dashboard.
 *
 * Every status / role badge in the app should use these classes so colors
 * stay consistent and are easy to update in one place.
 *
 * Color semantics:
 *   green  → success  (active, in-stock)
 *   amber  → warning  (low stock, pending)
 *   red    → error    (inactive, archived, out-of-stock)
 *   slate  → neutral  (draft, customer)
 *   violet → identity (admin)
 *   sky    → identity (staff)
 *   orange → identity (seller)
 */

import { Badge } from 'src/components/ui/badge'
import { cn } from 'src/lib/utils'

// ---------------------------------------------------------------------------
// Token map — single source of truth
// ---------------------------------------------------------------------------

export const BADGE_TOKENS = {
  // ── Status ────────────────────────────────────────────────────────────────
  active:
    '!tw-bg-green-100 !tw-text-green-800 dark:!tw-bg-green-900/50 dark:!tw-text-green-300',
  draft:
    '!tw-bg-slate-100 !tw-text-slate-600 dark:!tw-bg-slate-800 dark:!tw-text-slate-300',
  archived:
    '!tw-bg-red-100 !tw-text-red-700 dark:!tw-bg-red-900/50 dark:!tw-text-red-300',
  inactive:
    '!tw-bg-red-100 !tw-text-red-700 dark:!tw-bg-red-900/50 dark:!tw-text-red-300',

  // ── Inventory ─────────────────────────────────────────────────────────────
  inStock:
    '!tw-bg-green-100 !tw-text-green-800 dark:!tw-bg-green-900/50 dark:!tw-text-green-300',
  lowStock:
    '!tw-bg-amber-100 !tw-text-amber-700 dark:!tw-bg-amber-900/50 dark:!tw-text-amber-300',
  outOfStock:
    '!tw-bg-red-100 !tw-text-red-700 dark:!tw-bg-red-900/50 dark:!tw-text-red-300',

  // ── User roles ────────────────────────────────────────────────────────────
  roleAdmin:
    '!tw-bg-violet-100 !tw-text-violet-700 dark:!tw-bg-violet-900/50 dark:!tw-text-violet-300',
  roleStaff:
    '!tw-bg-sky-100 !tw-text-sky-700 dark:!tw-bg-sky-900/50 dark:!tw-text-sky-300',
  roleSeller:
    '!tw-bg-orange-100 !tw-text-orange-700 dark:!tw-bg-orange-900/50 dark:!tw-text-orange-300',
  roleCustomer:
    '!tw-bg-slate-100 !tw-text-slate-600 dark:!tw-bg-slate-800 dark:!tw-text-slate-300',

  // ── Order status ──────────────────────────────────────────────────────────
  orderNew:
    '!tw-bg-blue-100 !tw-text-blue-700 dark:!tw-bg-blue-900/50 dark:!tw-text-blue-300',
  orderPaid:
    '!tw-bg-amber-100 !tw-text-amber-700 dark:!tw-bg-amber-900/50 dark:!tw-text-amber-300',
  orderFulfilled:
    '!tw-bg-green-100 !tw-text-green-800 dark:!tw-bg-green-900/50 dark:!tw-text-green-300',
  orderCancelled:
    '!tw-bg-red-100 !tw-text-red-700 dark:!tw-bg-red-900/50 dark:!tw-text-red-300',

  // ── Payment status ────────────────────────────────────────────────────────
  paymentPaid:
    '!tw-bg-green-100 !tw-text-green-800 dark:!tw-bg-green-900/50 dark:!tw-text-green-300',
  paymentPending:
    '!tw-bg-amber-100 !tw-text-amber-700 dark:!tw-bg-amber-900/50 dark:!tw-text-amber-300',
  paymentRefunded:
    '!tw-bg-slate-100 !tw-text-slate-600 dark:!tw-bg-slate-800 dark:!tw-text-slate-300',
} as const

export type BadgeToken = keyof typeof BADGE_TOKENS

// ---------------------------------------------------------------------------
// StatusDot — small colored circle used alongside text labels
// ---------------------------------------------------------------------------

const DOT_COLORS: Record<BadgeToken, string> = {
  active: 'tw-bg-green-500 dark:tw-bg-green-400',
  draft: 'tw-bg-slate-400 dark:tw-bg-slate-500',
  archived: 'tw-bg-red-500 dark:tw-bg-red-400',
  inactive: 'tw-bg-red-500 dark:tw-bg-red-400',
  inStock: 'tw-bg-green-500 dark:tw-bg-green-400',
  lowStock: 'tw-bg-amber-500 dark:tw-bg-amber-400',
  outOfStock: 'tw-bg-red-500 dark:tw-bg-red-400',
  roleAdmin: 'tw-bg-violet-500 dark:tw-bg-violet-400',
  roleStaff: 'tw-bg-sky-500 dark:tw-bg-sky-400',
  roleSeller: 'tw-bg-orange-500 dark:tw-bg-orange-400',
  roleCustomer: 'tw-bg-slate-400 dark:tw-bg-slate-500',
  orderNew: 'tw-bg-blue-500 dark:tw-bg-blue-400',
  orderPaid: 'tw-bg-amber-500 dark:tw-bg-amber-400',
  orderFulfilled: 'tw-bg-green-500 dark:tw-bg-green-400',
  orderCancelled: 'tw-bg-red-500 dark:tw-bg-red-400',
  paymentPaid: 'tw-bg-green-500 dark:tw-bg-green-400',
  paymentPending: 'tw-bg-amber-500 dark:tw-bg-amber-400',
  paymentRefunded: 'tw-bg-slate-400 dark:tw-bg-slate-500',
}

// ---------------------------------------------------------------------------
// SemanticBadge — the universal badge component
// ---------------------------------------------------------------------------

type SemanticBadgeProps = {
  token: BadgeToken
  label: string
  dot?: boolean
  className?: string
}

export const SemanticBadge = ({
  token,
  label,
  dot = false,
  className,
}: SemanticBadgeProps) => (
  <Badge
    variant="secondary"
    className={cn(
      'tw-inline-flex tw-items-center tw-gap-1.5 tw-whitespace-nowrap tw-border-transparent tw-font-medium',
      BADGE_TOKENS[token],
      className
    )}
  >
    {dot && (
      <span
        className={cn(
          'tw-h-1.5 tw-w-1.5 tw-shrink-0 tw-rounded-full',
          DOT_COLORS[token]
        )}
        aria-hidden="true"
      />
    )}
    {label}
  </Badge>
)

// ---------------------------------------------------------------------------
// Convenience components — typed wrappers so call-sites stay readable
// ---------------------------------------------------------------------------

// Product status
type ProductStatus = 'active' | 'draft' | 'archived'

const PRODUCT_STATUS_CONFIG: Record<
  ProductStatus,
  { token: BadgeToken; label: string }
> = {
  active: { token: 'active', label: 'Active' },
  draft: { token: 'draft', label: 'Draft' },
  archived: { token: 'archived', label: 'Archived' },
}

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => {
  const config = PRODUCT_STATUS_CONFIG[status] ?? PRODUCT_STATUS_CONFIG.draft
  return <SemanticBadge token={config.token} label={config.label} dot />
}

// Inventory state
type InventoryState = 'inStock' | 'lowStock' | 'outOfStock'

export const InventoryBadge = ({
  state,
  compact = false,
}: {
  state: InventoryState
  compact?: boolean
}) => {
  const labels: Record<InventoryState, string> = compact
    ? {
        inStock: 'In',
        lowStock: 'Low',
        outOfStock: 'Out',
      }
    : {
        inStock: 'In Stock',
        lowStock: 'Low Stock',
        outOfStock: 'Out of Stock',
      }

  return (
    <SemanticBadge
      token={state}
      label={labels[state]}
      dot
      className={compact ? 'tw-px-2 tw-text-[11px] tw-leading-4' : undefined}
    />
  )
}

// User status
type UserStatusType = 'ACTIVE' | 'INACTIVE'

export const UserStatusBadge = ({ status }: { status: UserStatusType }) => (
  <SemanticBadge
    token={status === 'ACTIVE' ? 'active' : 'inactive'}
    label={status === 'ACTIVE' ? 'Active' : 'Inactive'}
    dot
  />
)

// User role
type UserRoleType = 'ADMIN' | 'STAFF' | 'SELLER' | 'USER'

const ROLE_BADGE_CONFIG: Record<
  UserRoleType,
  { token: BadgeToken; label: string }
> = {
  ADMIN: { token: 'roleAdmin', label: 'Admin' },
  STAFF: { token: 'roleStaff', label: 'Staff' },
  SELLER: { token: 'roleSeller', label: 'Seller' },
  USER: { token: 'roleCustomer', label: 'Customer' },
}

export const UserRoleBadge = ({ role }: { role: UserRoleType }) => {
  const normalizedRole = String(role).toUpperCase() as UserRoleType
  const config = ROLE_BADGE_CONFIG[normalizedRole] ?? ROLE_BADGE_CONFIG.USER
  return <SemanticBadge token={config.token} label={config.label} />
}

// Order status
type OrderStatusType = 'NEW' | 'PAID' | 'FULFILLED' | 'CANCELLED'

const ORDER_STATUS_CONFIG: Record<
  OrderStatusType,
  { token: BadgeToken; label: string }
> = {
  NEW: { token: 'orderNew', label: 'New' },
  PAID: { token: 'orderPaid', label: 'Paid' },
  FULFILLED: { token: 'orderFulfilled', label: 'Fulfilled' },
  CANCELLED: { token: 'orderCancelled', label: 'Cancelled' },
}

export const OrderStatusBadge = ({ status }: { status: OrderStatusType }) => {
  const config = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.NEW
  return <SemanticBadge token={config.token} label={config.label} dot />
}

// Payment status
type PaymentStatusType = 'PENDING' | 'PAID' | 'REFUNDED'

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatusType,
  { token: BadgeToken; label: string }
> = {
  PAID: { token: 'paymentPaid', label: 'Paid' },
  PENDING: { token: 'paymentPending', label: 'Pending' },
  REFUNDED: { token: 'paymentRefunded', label: 'Refunded' },
}

export const PaymentStatusBadge = ({
  status,
}: {
  status: PaymentStatusType
}) => {
  const config = PAYMENT_STATUS_CONFIG[status] ?? PAYMENT_STATUS_CONFIG.PENDING
  return <SemanticBadge token={config.token} label={config.label} dot />
}
