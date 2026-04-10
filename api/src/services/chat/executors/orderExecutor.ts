import { dashboardStats } from 'src/services/dashboard/dashboard'
import {
  createOrder,
  deleteOrder,
  order,
  orders,
  updateOrder,
} from 'src/services/orders/orders'
import { product, products } from 'src/services/products/products'

import { Params } from '../validators/intentValidator'

import type { ChatResult } from './types'

function ok(reply: string, data?: unknown): ChatResult {
  return { reply, data: data ? JSON.stringify(data) : null, success: true }
}

function err(reply: string): ChatResult {
  return { reply, data: null, success: false }
}

export async function listOrders(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.LIST_ORDERS.safeParse(raw)
  if (!p.success) return err('Invalid parameters for listing orders.')

  const result = await orders(p.data)
  const { orders: items, total } = result

  if (items.length === 0) return ok('No orders found matching your criteria.')

  const summary = items
    .map(
      (o) =>
        `• ${o.orderNumber} — $${o.totalAmount} — ${o.status} / ${o.paymentStatus}`
    )
    .join('\n')

  return ok(
    `Found **${total}** order(s) (showing ${items.length}):\n\n${summary}`,
    result
  )
}

export async function getOrder(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.GET_ORDER.safeParse(raw)
  if (!p.success) return err('Please provide an order ID or order number.')

  if (p.data.id) {
    const item = await order({ id: p.data.id })
    if (!item) return err(`No order found with ID \`${p.data.id}\`.`)
    return ok(
      `**${item.orderNumber}**\nCustomer: ${item.customer.name ?? item.customer.email}\nTotal: $${item.totalAmount} | Status: ${item.status} | Payment: ${item.paymentStatus} | Items: ${item.items.length}`,
      item
    )
  }

  if (p.data.orderNumber) {
    const result = await orders({ search: p.data.orderNumber, pageSize: 1 })
    if (result.orders.length === 0)
      return err(`No order found with number "${p.data.orderNumber}".`)
    const item = result.orders[0]
    return ok(
      `**${item.orderNumber}**\nCustomer: ${item.customer.name ?? item.customer.email}\nTotal: $${item.totalAmount} | Status: ${item.status} | Payment: ${item.paymentStatus}`,
      item
    )
  }

  return err('Please provide an order ID or order number.')
}

export async function createNewOrder(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.CREATE_ORDER.safeParse(raw)
  if (!p.success) {
    const fields = p.error.issues.map((e) => e.path.join('.')).join(', ')
    return err(
      `Missing or invalid fields: ${fields}. Required: customerName, customerEmail, and at least one item with a product name or ID and quantity.`
    )
  }

  // Resolve each item: look up the product to get its ID, name, and price.
  const resolvedItems: Array<{
    productId: string
    name: string
    quantity: number
    unitPrice: number
  }> = []

  for (const item of p.data.items) {
    if (item.productId) {
      const found = await product({ id: item.productId })
      if (!found) return err(`No product found with ID \`${item.productId}\`.`)
      resolvedItems.push({
        productId: found.id,
        name: found.name,
        quantity: item.quantity,
        unitPrice: Number(found.price),
      })
    } else if (item.productName) {
      const result = await products({ search: item.productName, pageSize: 5 })
      if (result.products.length === 0)
        return err(
          `No product found matching "${item.productName}". Please check the product name.`
        )
      if (result.products.length > 1) {
        const list = result.products
          .map((p) => `• ${p.name} (ID: \`${p.id}\`)`)
          .join('\n')
        return err(
          `Multiple products match "${item.productName}". Please be more specific:\n\n${list}`
        )
      }
      const found = result.products[0]
      resolvedItems.push({
        productId: found.id,
        name: found.name,
        quantity: item.quantity,
        unitPrice: Number(found.price),
      })
    } else {
      return err('Each item must have either a product name or product ID.')
    }
  }

  const totalAmount = resolvedItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  )

  const record = await createOrder({
    input: {
      customerName: p.data.customerName,
      customerEmail: p.data.customerEmail,
      status: p.data.status ?? 'NEW',
      paymentStatus: p.data.paymentStatus ?? 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      totalAmount,
      items: resolvedItems,
    },
  })

  const itemSummary = resolvedItems
    .map((i) => `• ${i.name} × ${i.quantity} @ $${i.unitPrice}`)
    .join('\n')

  return ok(
    `Order **${record.orderNumber}** created successfully.\nCustomer: ${p.data.customerName} (${p.data.customerEmail})\nTotal: $${totalAmount.toFixed(2)}\n\n${itemSummary}`,
    record
  )
}

export async function updateOrderStatus(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.UPDATE_ORDER_STATUS.safeParse(raw)
  if (!p.success) {
    const fields = p.error.issues.map((e) => e.path.join('.')).join(', ')
    return err(`Invalid parameters: ${fields}. Required: id, status.`)
  }

  const { id, status, paymentStatus } = p.data
  const item = await updateOrder({
    id,
    input: {
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
    },
  })

  return ok(
    `Order **${item.orderNumber}** updated.\nStatus: ${item.status} | Payment: ${item.paymentStatus}`,
    item
  )
}

export async function deleteExistingOrder(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.DELETE_ORDER.safeParse(raw)
  if (!p.success)
    return err('Please provide the order ID or order number to delete.')

  let targetId = p.data.id

  if (!targetId && p.data.orderNumber) {
    const result = await orders({ search: p.data.orderNumber, pageSize: 1 })
    if (result.orders.length === 0)
      return err(`No order found with number "${p.data.orderNumber}".`)
    targetId = result.orders[0].id
  }

  if (!targetId) return err('Please provide the order ID to delete.')

  const item = await deleteOrder({ id: targetId })
  return ok(`Order **${item.orderNumber}** has been deleted.`)
}

export async function getOrderMetrics(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.GET_ORDER_METRICS.safeParse(raw)
  if (!p.success) return err('Invalid time range.')

  const stats = await dashboardStats({ timeRange: p.data.timeRange })
  const m = stats.metrics
  const os = stats.orderStatus

  const statusLine = os.map((s) => `${s.label}: ${s.value}`).join(' | ')

  return ok(
    `**Order Metrics (${p.data.timeRange})**\n` +
      `Revenue: $${m.totalRevenue.toLocaleString()} (${m.revenueTrend >= 0 ? '+' : ''}${m.revenueTrend}%)\n` +
      `Orders: ${m.totalOrders} (${m.ordersTrend >= 0 ? '+' : ''}${m.ordersTrend}%)\n` +
      `Avg. Order Value: $${m.avgOrderValue}\n` +
      `Status breakdown: ${statusLine}`,
    stats
  )
}
