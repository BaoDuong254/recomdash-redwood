import { db } from 'src/lib/db'

const MAX_RESULTS = 5

export const globalSearch = async ({ query }: { query: string }) => {
  const q = query.trim()

  if (!q) return { products: [], orders: [] }

  const filter = { contains: q, mode: 'insensitive' } as const

  const [products, orders] = await Promise.all([
    db.product.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: filter }, { sku: filter }, { category: filter }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        price: true,
        status: true,
      },
      take: MAX_RESULTS,
      orderBy: { name: 'asc' },
    }),
    db.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { orderNumber: filter },
          { customerName: filter },
          { customerEmail: filter },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        status: true,
        totalAmount: true,
      },
      take: MAX_RESULTS,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    products: products.map((p) => ({
      ...p,
      price: Number(p.price),
      status: p.status.toLowerCase(),
    })),
    orders: orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      customerName: o.customerName ?? null,
      customerEmail: o.customerEmail ?? null,
    })),
  }
}
