export type ProductStatus = 'active' | 'draft' | 'archived'

export type Product = {
  id: string
  name: string
  sku: string
  image: string
  status: ProductStatus
  inventory: number
  lowStockThreshold: number
  price: number
  category: string
}

export type ProductFiltersState = {
  search: string
  category: string
  status: string
  inventory: string
}

export type PaginationState = {
  page: number
  pageSize: number
  total: number
}
