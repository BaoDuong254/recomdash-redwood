import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client'

import { db } from 'src/lib/db'

// ---------------------------------------------------------------------------
// Shared filter builder
// ---------------------------------------------------------------------------

function buildWhere(opts: {
  search?: string | null
  status?: OrderStatus | null
  paymentStatus?: PaymentStatus | null
}): Prisma.OrderWhereInput {
  const { search, status, paymentStatus } = opts
  return {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
}

// Map a DB order record (with user + items relations) to the GraphQL shape
function toOrderShape(
  order: Prisma.OrderGetPayload<{
    include: { user: true; items: { include: { product: true } } }
  }>
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    customer: {
      id: order.user.id,
      name: order.user.name ?? null,
      email: order.user.email,
      avatarUrl: order.user.avatarUrl ?? null,
    },
    items: order.items
      .filter((i) => !i.deletedAt)
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
  }
}

const INCLUDE_FULL = {
  user: true,
  items: { include: { product: true } },
} as const

// ---------------------------------------------------------------------------
// Query resolvers
// ---------------------------------------------------------------------------

type OrdersArgs = {
  page?: number | null
  pageSize?: number | null
  search?: string | null
  status?: OrderStatus | null
  paymentStatus?: PaymentStatus | null
}

export const orders = async ({
  page = 1,
  pageSize = 10,
  search,
  status,
  paymentStatus,
}: OrdersArgs = {}) => {
  const take = pageSize ?? 10
  const skip = ((page ?? 1) - 1) * take
  const where = buildWhere({ search, status, paymentStatus })

  const [ordersData, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_FULL,
    }),
    db.order.count({ where }),
  ])

  return { orders: ordersData.map(toOrderShape), total }
}

export const order = async ({ id }: { id: string }) => {
  const record = await db.order.findUnique({
    where: { id },
    include: INCLUDE_FULL,
  })
  if (!record) return null
  return toOrderShape(record)
}

export const orderStats = async () => {
  const baseWhere: Prisma.OrderWhereInput = { deletedAt: null }

  const [total, newCount, paid, fulfilled, cancelled] = await Promise.all([
    db.order.count({ where: baseWhere }),
    db.order.count({ where: { ...baseWhere, status: 'NEW' } }),
    db.order.count({ where: { ...baseWhere, status: 'PAID' } }),
    db.order.count({ where: { ...baseWhere, status: 'FULFILLED' } }),
    db.order.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
  ])

  return { total, new: newCount, paid, fulfilled, cancelled }
}

// ---------------------------------------------------------------------------
// Mutation resolvers
// ---------------------------------------------------------------------------

type OrderItemInput = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

type CreateOrderInput = {
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  totalAmount: number
  userId: string
  items: OrderItemInput[]
}

export const createOrder = async ({ input }: { input: CreateOrderInput }) => {
  const record = await db.order.create({
    data: {
      orderNumber: input.orderNumber,
      status: input.status,
      paymentStatus: input.paymentStatus,
      fulfillmentStatus: input.fulfillmentStatus,
      totalAmount: input.totalAmount,
      userId: input.userId,
      items: {
        create: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          productId: item.productId,
        })),
      },
    },
    include: INCLUDE_FULL,
  })
  return toOrderShape(record)
}

type UpdateOrderInput = {
  status?: OrderStatus | null
  paymentStatus?: PaymentStatus | null
  fulfillmentStatus?: FulfillmentStatus | null
  totalAmount?: number | null
}

export const updateOrder = async ({
  id,
  input,
}: {
  id: string
  input: UpdateOrderInput
}) => {
  const record = await db.order.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.paymentStatus !== undefined
        ? { paymentStatus: input.paymentStatus }
        : {}),
      ...(input.fulfillmentStatus !== undefined
        ? { fulfillmentStatus: input.fulfillmentStatus }
        : {}),
      ...(input.totalAmount !== undefined
        ? { totalAmount: input.totalAmount }
        : {}),
    },
    include: INCLUDE_FULL,
  })
  return toOrderShape(record)
}

export const deleteOrder = async ({ id }: { id: string }) => {
  const record = await db.order.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: INCLUDE_FULL,
  })
  return toOrderShape(record)
}
