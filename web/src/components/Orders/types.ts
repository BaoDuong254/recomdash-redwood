export type OrderStatus = 'NEW' | 'PAID' | 'FULFILLED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED'
export type FulfillmentStatus = 'UNFULFILLED' | 'FULFILLED'

export type OrderCustomer = {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export type OrderItem = {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

export type Order = {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  totalAmount: number
  createdAt: string
  customer: OrderCustomer
  items?: OrderItem[]
}

export type OrderStats = {
  total: number
  new: number
  paid: number
  fulfilled: number
  cancelled: number
}

export type OrderFiltersState = {
  search: string
  status: string
  paymentStatus: string
  dateRange: string
}

export type PaginationState = {
  page: number
  pageSize: number
  total: number
}

export const STATUS_OPTIONS = [
  { value: 'All Statuses', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FULFILLED', label: 'Fulfilled' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export const PAYMENT_OPTIONS = [
  { value: 'All Payments', label: 'All Payments' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REFUNDED', label: 'Refunded' },
]

export const DATE_OPTIONS = [
  { value: 'All Time', label: 'All Time' },
  { value: 'Last 7 days', label: 'Last 7 days' },
  { value: 'Last 30 days', label: 'Last 30 days' },
  { value: 'Last 90 days', label: 'Last 90 days' },
]
