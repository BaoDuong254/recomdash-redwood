export type UserRole = 'ADMIN' | 'USER' | 'SELLER' | 'STAFF'
export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type User = {
  id: string
  name: string | null
  email: string
  role: UserRole
  status: UserStatus
  avatarUrl: string | null
  createdAt: string
}

export type UserFiltersState = {
  search: string
  role: string
  status: string
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  SELLER: 'Seller',
  USER: 'Customer',
}

export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'USER', label: 'Customer' },
]

export const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]
