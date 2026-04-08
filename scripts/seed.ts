import { db } from 'api/src/lib/db'

import { hashPassword } from '@redwoodjs/auth-dbauth-api'

export default async () => {
  try {
    // ─── Users ────────────────────────────────────────────────────────────────

    const usersData = [
      {
        email: 'admin@recomdash.dev',
        name: 'Admin',
        password: process.env.REDWOOD_ENV_ACCOUNT_PASSWORD || 'Admin@1234',
        role: 'ADMIN' as const,
      },
      {
        email: 'seller@recomdash.dev',
        name: 'Bob Seller',
        password: process.env.REDWOOD_ENV_ACCOUNT_PASSWORD || 'Seller@1234',
        role: 'SELLER' as const,
      },
      {
        email: 'jane@example.com',
        name: 'Jane Doe',
        password: process.env.REDWOOD_ENV_ACCOUNT_PASSWORD || 'User@1234',
        role: 'USER' as const,
      },
      {
        email: 'john@example.com',
        name: 'John Smith',
        password: process.env.REDWOOD_ENV_ACCOUNT_PASSWORD || 'User@1234',
        role: 'USER' as const,
      },
      {
        email: 'emily@example.com',
        name: 'Emily Chen',
        password: process.env.REDWOOD_ENV_ACCOUNT_PASSWORD || 'User@1234',
        role: 'USER' as const,
      },
    ]

    const createdUsers = await Promise.all(
      usersData.map(({ email, name, password, role }) => {
        const [hashedPassword, salt] = hashPassword(password)
        return db.user.upsert({
          where: { email },
          create: { email, name, hashedPassword, salt, role },
          update: {},
        })
      })
    )

    console.info(`  Seeded ${createdUsers.length} users`)

    // ─── Products ─────────────────────────────────────────────────────────────

    const productsData = [
      {
        name: 'Wireless Noise-Cancelling Headphones',
        price: 299.99,
        stock: 120,
      },
      { name: 'Mechanical Gaming Keyboard', price: 149.95, stock: 85 },
      { name: '4K Ultra HD Monitor 27"', price: 499.0, stock: 40 },
      { name: 'USB-C Laptop Docking Station', price: 189.5, stock: 60 },
      { name: 'Ergonomic Office Chair', price: 389.0, stock: 25 },
      { name: 'Portable Bluetooth Speaker', price: 79.99, stock: 200 },
      { name: 'Smart Fitness Watch', price: 229.0, stock: 150 },
      { name: 'Webcam 1080p HD', price: 89.95, stock: 95 },
      { name: 'Wireless Charging Pad', price: 39.99, stock: 300 },
      { name: 'Standing Desk Converter', price: 269.0, stock: 30 },
    ]

    const createdProducts = await db.$transaction(
      productsData.map((p) =>
        db.product.create({ data: { ...p, price: p.price } })
      )
    )

    console.info(`  Seeded ${createdProducts.length} products`)

    // ─── Orders ───────────────────────────────────────────────────────────────

    // Helper to pick a random element
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

    const orderStatuses = [
      'PENDING',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ] as const

    // Buyers are the three regular/seller users (indices 1–4)
    const buyers = createdUsers.slice(1)

    const ordersToCreate = [
      // Jane — two orders
      {
        user: createdUsers[2],
        status: 'DELIVERED' as const,
        items: [
          { product: createdProducts[0], quantity: 1 },
          { product: createdProducts[8], quantity: 2 },
        ],
      },
      {
        user: createdUsers[2],
        status: 'PROCESSING' as const,
        items: [{ product: createdProducts[4], quantity: 1 }],
      },
      // John — two orders
      {
        user: createdUsers[3],
        status: 'SHIPPED' as const,
        items: [
          { product: createdProducts[2], quantity: 1 },
          { product: createdProducts[7], quantity: 1 },
        ],
      },
      {
        user: createdUsers[3],
        status: 'PENDING' as const,
        items: [{ product: createdProducts[9], quantity: 1 }],
      },
      // Emily — two orders
      {
        user: createdUsers[4],
        status: 'DELIVERED' as const,
        items: [
          { product: createdProducts[1], quantity: 1 },
          { product: createdProducts[5], quantity: 1 },
        ],
      },
      {
        user: createdUsers[4],
        status: 'CANCELLED' as const,
        items: [{ product: createdProducts[6], quantity: 1 }],
      },
      // Bob (seller) — one order as a buyer
      {
        user: createdUsers[1],
        status: 'DELIVERED' as const,
        items: [
          { product: createdProducts[3], quantity: 2 },
          { product: createdProducts[8], quantity: 3 },
        ],
      },
      // Random extra orders for dashboard variety
      ...Array.from({ length: 8 }, () => {
        const numItems = Math.floor(Math.random() * 3) + 1
        const items = Array.from({ length: numItems }, () => ({
          product: pick(createdProducts),
          quantity: Math.floor(Math.random() * 4) + 1,
        }))
        return {
          user: pick(buyers),
          status: pick(orderStatuses),
          items,
        }
      }),
    ]

    let orderCount = 0
    for (const { user, status, items } of ordersToCreate) {
      const totalAmount = items.reduce(
        (sum, { product, quantity }) => sum + Number(product.price) * quantity,
        0
      )

      await db.order.create({
        data: {
          userId: user.id,
          status,
          totalAmount,
          items: {
            create: items.map(({ product, quantity }) => ({
              productId: product.id,
              quantity,
              unitPrice: product.price,
            })),
          },
        },
      })
      orderCount++
    }

    console.info(`  Seeded ${orderCount} orders`)
    console.info('\n  Database seeded successfully!\n')
  } catch (error) {
    console.error(error)
  }
}
