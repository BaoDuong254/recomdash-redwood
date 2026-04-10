import {
  createProduct,
  deleteProduct,
  product,
  products,
  updateProduct,
} from 'src/services/products/products'

import { Params } from '../validators/intentValidator'

import type { ChatResult } from './types'

function ok(reply: string, data?: unknown): ChatResult {
  return { reply, data: data ? JSON.stringify(data) : null, success: true }
}

function err(reply: string): ChatResult {
  return { reply, data: null, success: false }
}

export async function listProducts(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.LIST_PRODUCTS.safeParse(raw)
  if (!p.success) return err('Invalid parameters for listing products.')

  const result = await products(p.data)
  const { products: items, total } = result

  if (items.length === 0) return ok('No products found matching your criteria.')

  const summary = items
    .map((i) => `• ${i.name} (${i.sku}) — $${i.price} — ${i.status}`)
    .join('\n')

  return ok(
    `Found **${total}** product(s) (showing ${items.length}):\n\n${summary}`,
    result
  )
}

export async function getProduct(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.GET_PRODUCT.safeParse(raw)
  if (!p.success) return err('Please provide a product ID or search term.')

  if (p.data.id) {
    const item = await product({ id: p.data.id })
    if (!item) return err(`No product found with ID \`${p.data.id}\`.`)
    return ok(
      `**${item.name}**\nSKU: ${item.sku} | Price: $${item.price} | Stock: ${item.inventory} | Status: ${item.status} | Category: ${item.category}`,
      item
    )
  }

  if (p.data.search) {
    const result = await products({ search: p.data.search, pageSize: 5 })
    if (result.products.length === 0)
      return err(`No products found matching "${p.data.search}".`)
    if (result.products.length === 1) {
      const item = result.products[0]
      return ok(
        `**${item.name}**\nSKU: ${item.sku} | Price: $${item.price} | Stock: ${item.inventory} | Status: ${item.status}`,
        item
      )
    }
    const list = result.products
      .map((i) => `• ${i.name} (ID: \`${i.id}\`)`)
      .join('\n')
    return ok(`Found ${result.products.length} matching products:\n\n${list}`)
  }

  return err('Please provide a product ID or search term.')
}

export async function createNewProduct(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.CREATE_PRODUCT.safeParse(raw)
  if (!p.success) {
    const fields = p.error.issues.map((e) => e.path.join('.')).join(', ')
    return err(
      `Missing or invalid fields: ${fields}. Please provide all required product details.`
    )
  }

  const item = await createProduct({
    input: {
      name: p.data.name!,
      sku: p.data.sku!,
      price: p.data.price!,
      inventory: p.data.inventory!,
      category: p.data.category!,
      status: p.data.status ?? 'draft',
      lowStockThreshold: p.data.lowStockThreshold ?? 10,
      description: p.data.description,
    },
  })
  return ok(
    `Product **${item.name}** created successfully.\nSKU: ${item.sku} | Price: $${item.price} | Status: ${item.status}`,
    item
  )
}

export async function updateExistingProduct(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.UPDATE_PRODUCT.safeParse(raw)
  if (!p.success)
    return err('Invalid update parameters. An `id` field is required.')

  const { id, ...fields } = p.data
  if (Object.keys(fields).length === 0)
    return err('No fields to update were specified.')

  const item = await updateProduct({ id, input: fields })
  return ok(`Product **${item.name}** updated successfully.`, item)
}

export async function deleteExistingProduct(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.DELETE_PRODUCT.safeParse(raw)
  if (!p.success) return err('Please provide the product ID to delete.')

  let targetId = p.data.id

  // If no ID, try to resolve by name search
  if (!targetId && p.data.name) {
    const result = await products({ search: p.data.name, pageSize: 5 })
    if (result.products.length === 0)
      return err(`No product found matching "${p.data.name}".`)
    if (result.products.length > 1) {
      const list = result.products
        .map((i) => `• ${i.name} (ID: \`${i.id}\`)`)
        .join('\n')
      return err(
        `Multiple products match "${p.data.name}". Please specify the ID:\n\n${list}`
      )
    }
    targetId = result.products[0].id
  }

  if (!targetId) return err('Please provide the product ID to delete.')

  const item = await deleteProduct({ id: targetId })
  return ok(`Product **${item.name}** has been deleted.`)
}

export async function listLowStock(): Promise<ChatResult> {
  const result = await products({ inventoryFilter: 'Low Stock', pageSize: 20 })
  if (result.products.length === 0) return ok('No low-stock products found.')

  const summary = result.products
    .map(
      (i) =>
        `• ${i.name} (${i.sku}) — stock: ${i.inventory}/${i.lowStockThreshold}`
    )
    .join('\n')

  return ok(`**${result.total}** low-stock product(s):\n\n${summary}`, result)
}
