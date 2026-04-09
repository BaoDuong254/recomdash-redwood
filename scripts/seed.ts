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
        sku: 'WNC-H001',
        price: 299.99,
        stock: 145,
        lowStockThreshold: 20,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/6366f1/ffffff?text=WH',
        description:
          'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res Audio support.',
      },
      {
        name: 'Ergonomic Office Chair',
        sku: 'ERG-C002',
        price: 549.0,
        stock: 32,
        lowStockThreshold: 10,
        status: 'ACTIVE' as const,
        category: 'Furniture',
        image: 'https://placehold.co/400x400/8b5cf6/ffffff?text=EC',
        description:
          'Fully adjustable ergonomic chair with lumbar support, breathable mesh back, and 5-year warranty.',
      },
      {
        name: 'Mechanical Keyboard Pro',
        sku: 'MKP-K003',
        price: 189.99,
        stock: 8,
        lowStockThreshold: 15,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/ec4899/ffffff?text=MK',
        description:
          'TKL mechanical keyboard with Cherry MX switches, per-key RGB backlighting, and aluminum frame.',
      },
      {
        name: 'Leather Messenger Bag',
        sku: 'LMB-B004',
        price: 129.99,
        stock: 0,
        lowStockThreshold: 5,
        status: 'DRAFT' as const,
        category: 'Accessories',
        image: 'https://placehold.co/400x400/f59e0b/ffffff?text=LB',
        description:
          'Genuine leather messenger bag with padded laptop compartment and multiple organizer pockets.',
      },
      {
        name: 'Standing Desk Converter',
        sku: 'SDC-D005',
        price: 349.0,
        stock: 63,
        lowStockThreshold: 10,
        status: 'ACTIVE' as const,
        category: 'Furniture',
        image: 'https://placehold.co/400x400/10b981/ffffff?text=SD',
        description:
          'Adjustable sit-stand desk converter with dual monitor arm, gas-spring lift, and cable management.',
      },
      {
        name: '4K Ultra-Wide Monitor',
        sku: 'UWM-M006',
        price: 899.0,
        stock: 19,
        lowStockThreshold: 20,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/3b82f6/ffffff?text=4K',
        description:
          '34-inch curved ultra-wide monitor with 4K resolution, 144Hz refresh rate, and USB-C connectivity.',
      },
      {
        name: 'Bamboo Wireless Charger',
        sku: 'BWC-C007',
        price: 49.99,
        stock: 200,
        lowStockThreshold: 30,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/84cc16/ffffff?text=BW',
        description:
          'Eco-friendly 15W fast wireless charging pad made from sustainable bamboo with Qi compatibility.',
      },
      {
        name: 'Minimalist Walnut Desk',
        sku: 'MWD-D008',
        price: 799.0,
        stock: 12,
        lowStockThreshold: 5,
        status: 'ACTIVE' as const,
        category: 'Furniture',
        image: 'https://placehold.co/400x400/d97706/ffffff?text=WD',
        description:
          'Solid walnut writing desk with clean lines, hidden cable management, and optional drawer add-on.',
      },
      {
        name: 'USB-C Laptop Docking Station',
        sku: 'UDS-D009',
        price: 189.5,
        stock: 54,
        lowStockThreshold: 15,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/0ea5e9/ffffff?text=DS',
        description:
          '12-in-1 USB-C docking station with dual 4K display output, 100W PD charging, and Gigabit Ethernet.',
      },
      {
        name: 'Smart Fitness Watch',
        sku: 'SFW-W010',
        price: 229.0,
        stock: 150,
        lowStockThreshold: 25,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/f43f5e/ffffff?text=FW',
        description:
          'Advanced fitness tracker with heart rate monitoring, GPS, sleep tracking, and 7-day battery life.',
      },
      {
        name: 'Portable Bluetooth Speaker',
        sku: 'PBS-S011',
        price: 79.99,
        stock: 188,
        lowStockThreshold: 30,
        status: 'ACTIVE' as const,
        category: 'Electronics',
        image: 'https://placehold.co/400x400/a855f7/ffffff?text=BS',
        description:
          'Waterproof IP67 portable speaker with 360° sound, 24-hour battery, and multi-device pairing.',
      },
      {
        name: 'Leather Card Wallet',
        sku: 'LCW-W012',
        price: 39.99,
        stock: 0,
        lowStockThreshold: 10,
        status: 'ARCHIVED' as const,
        category: 'Accessories',
        image: 'https://placehold.co/400x400/64748b/ffffff?text=CW',
        description:
          'Slim RFID-blocking leather card wallet with minimalist design, holds up to 8 cards.',
      },
    ]

    const createdProducts = await Promise.all(
      productsData.map((p) =>
        db.product.upsert({
          where: { sku: p.sku },
          create: p,
          update: p,
        })
      )
    )

    console.info(`  Seeded ${createdProducts.length} products`)

    // ─── Orders ───────────────────────────────────────────────────────────────

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

    const buyers = createdUsers.slice(1)

    const ordersToCreate = [
      {
        user: createdUsers[2],
        status: 'FULFILLED' as const,
        paymentStatus: 'PAID' as const,
        fulfillmentStatus: 'FULFILLED' as const,
        items: [
          { product: createdProducts[0], quantity: 1 },
          { product: createdProducts[6], quantity: 2 },
        ],
      },
      {
        user: createdUsers[2],
        status: 'PAID' as const,
        paymentStatus: 'PAID' as const,
        fulfillmentStatus: 'UNFULFILLED' as const,
        items: [{ product: createdProducts[1], quantity: 1 }],
      },
      {
        user: createdUsers[3],
        status: 'NEW' as const,
        paymentStatus: 'PENDING' as const,
        fulfillmentStatus: 'UNFULFILLED' as const,
        items: [
          { product: createdProducts[5], quantity: 1 },
          { product: createdProducts[8], quantity: 1 },
        ],
      },
      {
        user: createdUsers[3],
        status: 'CANCELLED' as const,
        paymentStatus: 'REFUNDED' as const,
        fulfillmentStatus: 'UNFULFILLED' as const,
        items: [{ product: createdProducts[4], quantity: 1 }],
      },
      {
        user: createdUsers[4],
        status: 'FULFILLED' as const,
        paymentStatus: 'PAID' as const,
        fulfillmentStatus: 'FULFILLED' as const,
        items: [
          { product: createdProducts[2], quantity: 1 },
          { product: createdProducts[10], quantity: 1 },
        ],
      },
      {
        user: createdUsers[4],
        status: 'NEW' as const,
        paymentStatus: 'PENDING' as const,
        fulfillmentStatus: 'UNFULFILLED' as const,
        items: [{ product: createdProducts[9], quantity: 1 }],
      },
      {
        user: createdUsers[1],
        status: 'FULFILLED' as const,
        paymentStatus: 'PAID' as const,
        fulfillmentStatus: 'FULFILLED' as const,
        items: [
          { product: createdProducts[7], quantity: 1 },
          { product: createdProducts[6], quantity: 3 },
        ],
      },
      ...Array.from({ length: 8 }, () => {
        const numItems = Math.floor(Math.random() * 3) + 1
        const statusOptions = [
          {
            status: 'NEW' as const,
            paymentStatus: 'PENDING' as const,
            fulfillmentStatus: 'UNFULFILLED' as const,
          },
          {
            status: 'PAID' as const,
            paymentStatus: 'PAID' as const,
            fulfillmentStatus: 'UNFULFILLED' as const,
          },
          {
            status: 'FULFILLED' as const,
            paymentStatus: 'PAID' as const,
            fulfillmentStatus: 'FULFILLED' as const,
          },
          {
            status: 'CANCELLED' as const,
            paymentStatus: 'REFUNDED' as const,
            fulfillmentStatus: 'UNFULFILLED' as const,
          },
        ]
        const statusCombo = pick(statusOptions)
        return {
          user: pick(buyers),
          ...statusCombo,
          items: Array.from({ length: numItems }, () => ({
            product: pick(createdProducts),
            quantity: Math.floor(Math.random() * 4) + 1,
          })),
        }
      }),
    ]

    let orderCount = 0
    for (const {
      user,
      status,
      paymentStatus,
      fulfillmentStatus,
      items,
    } of ordersToCreate) {
      const totalAmount = items.reduce(
        (sum, { product, quantity }) => sum + Number(product.price) * quantity,
        0
      )
      const orderNumber = `#ORD-${Date.now()}-${orderCount + 1}`

      await db.order.create({
        data: {
          userId: user.id,
          orderNumber,
          status,
          paymentStatus,
          fulfillmentStatus,
          totalAmount,
          items: {
            create: items.map(({ product, quantity }) => ({
              name: product.name,
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
