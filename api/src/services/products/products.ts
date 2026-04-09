import type { Prisma, ProductStatus } from '@prisma/client'

import { UserInputError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

// ---------------------------------------------------------------------------
// Status mapping: DB uses UPPERCASE, SDL/frontend expects lowercase
// ---------------------------------------------------------------------------

function toDbStatus(status: string): ProductStatus {
  return status.toUpperCase() as ProductStatus
}

// ---------------------------------------------------------------------------
// Shape mapper — converts DB record to the SDL Product type
// ---------------------------------------------------------------------------

function toProductShape(
  product: Prisma.ProductGetPayload<Record<string, never>>
) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    inventory: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    status: product.status.toLowerCase(),
    category: product.category,
    image: product.image ?? '',
    description: product.description ?? '',
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Filter builder
// ---------------------------------------------------------------------------

function buildWhere(opts: {
  search?: string | null
  category?: string | null
  status?: string | null
  inventoryFilter?: string | null
}): Prisma.ProductWhereInput {
  const { search, category, status, inventoryFilter } = opts

  // Inventory filter: 'Low Stock' requires comparing two columns (stock vs
  // lowStockThreshold). Prisma doesn't support column-vs-column comparisons in
  // findMany; that case is handled post-query in the service layer instead.
  const inventoryWhere: Prisma.ProductWhereInput =
    inventoryFilter === 'Out of Stock'
      ? { stock: 0 }
      : inventoryFilter === 'In Stock'
        ? { stock: { gt: 0 } }
        : {}

  return {
    deletedAt: null,
    ...inventoryWhere,
    ...(category ? { category } : {}),
    ...(status ? { status: toDbStatus(status) } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// Query resolvers
// ---------------------------------------------------------------------------

type ProductsArgs = {
  page?: number | null
  pageSize?: number | null
  search?: string | null
  category?: string | null
  status?: string | null
  inventoryFilter?: string | null
}

export const products = async ({
  page = 1,
  pageSize = 10,
  search,
  category,
  status,
  inventoryFilter,
}: ProductsArgs = {}) => {
  const take = pageSize ?? 10
  const skip = ((page ?? 1) - 1) * take
  const where = buildWhere({ search, category, status, inventoryFilter })

  const isLowStock = inventoryFilter === 'Low Stock'

  if (isLowStock) {
    // Low Stock: stock > 0 AND stock <= lowStockThreshold — compared as columns.
    // Fetch without pagination first, filter in memory, then slice.
    const allRecords = await db.product.findMany({
      where: { ...where, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    })
    const lowStock = allRecords.filter((p) => p.stock <= p.lowStockThreshold)
    const total = lowStock.length
    const sliced = lowStock.slice(skip, skip + take)
    return { products: sliced.map(toProductShape), total }
  }

  const [productsData, total] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    db.product.count({ where }),
  ])

  return { products: productsData.map(toProductShape), total }
}

type ExportProductsArgs = {
  search?: string | null
  category?: string | null
  status?: string | null
  inventoryFilter?: string | null
}

export const exportProducts = async ({
  search,
  category,
  status,
  inventoryFilter,
}: ExportProductsArgs = {}) => {
  const where = buildWhere({ search, category, status, inventoryFilter })
  const isLowStock = inventoryFilter === 'Low Stock'

  if (isLowStock) {
    const allRecords = await db.product.findMany({
      where: { ...where, stock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    })
    return allRecords
      .filter((p) => p.stock <= p.lowStockThreshold)
      .map(toProductShape)
  }

  const records = await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return records.map(toProductShape)
}

export const product = async ({ id }: { id: string }) => {
  const record = await db.product.findUnique({ where: { id } })
  if (!record) return null
  return toProductShape(record)
}

// ---------------------------------------------------------------------------
// Mutation resolvers
// ---------------------------------------------------------------------------

type CreateProductInput = {
  name: string
  sku: string
  price: number
  inventory: number
  lowStockThreshold: number
  status: string
  category: string
  image?: string | null
  description?: string | null
}

export const createProduct = async ({
  input,
}: {
  input: CreateProductInput
}) => {
  const existing = await db.product.findFirst({
    where: { sku: input.sku, deletedAt: null },
  })
  if (existing) {
    throw new UserInputError(`SKU "${input.sku}" is already in use.`)
  }

  const record = await db.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      price: input.price,
      stock: input.inventory,
      lowStockThreshold: input.lowStockThreshold,
      status: toDbStatus(input.status),
      category: input.category,
      image: input.image || null,
      description: input.description || null,
    },
  })
  return toProductShape(record)
}

type UpdateProductInput = {
  name?: string | null
  sku?: string | null
  price?: number | null
  inventory?: number | null
  lowStockThreshold?: number | null
  status?: string | null
  category?: string | null
  image?: string | null
  description?: string | null
}

export const updateProduct = async ({
  id,
  input,
}: {
  id: string
  input: UpdateProductInput
}) => {
  if (input.sku) {
    const existing = await db.product.findFirst({
      where: { sku: input.sku, deletedAt: null, NOT: { id } },
    })
    if (existing) {
      throw new UserInputError(`SKU "${input.sku}" is already in use.`)
    }
  }

  const record = await db.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.inventory !== undefined ? { stock: input.inventory } : {}),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: input.lowStockThreshold }
        : {}),
      ...(input.status !== undefined
        ? { status: toDbStatus(input.status as string) }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.image !== undefined ? { image: input.image || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
    },
  })
  return toProductShape(record)
}

export const deleteProduct = async ({ id }: { id: string }) => {
  const record = await db.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
  return toProductShape(record)
}
