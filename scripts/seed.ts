import { db } from 'api/src/lib/db'

import { hashPassword } from '@redwoodjs/auth-dbauth-api'

export default async () => {
  try {
    // ─── Users ────────────────────────────────────────────────────────────────

    const usersData = [
      {
        email: 'admin@recomdash.dev',
        name: 'Admin',
        password: process.env.SEED_ACCOUNT_PASSWORD || 'Admin@1234',
        role: 'ADMIN' as const,
      },
      {
        email: 'seller@recomdash.dev',
        name: 'Bob Seller',
        password: process.env.SEED_ACCOUNT_PASSWORD || 'Seller@1234',
        role: 'SELLER' as const,
      },
      {
        email: 'jane@example.com',
        name: 'Jane Doe',
        password: process.env.SEED_ACCOUNT_PASSWORD || 'User@1234',
        role: 'USER' as const,
      },
      {
        email: 'john@example.com',
        name: 'John Smith',
        password: process.env.SEED_ACCOUNT_PASSWORD || 'User@1234',
        role: 'USER' as const,
      },
      {
        email: 'emily@example.com',
        name: 'Emily Chen',
        password: process.env.SEED_ACCOUNT_PASSWORD || 'User@1234',
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

    // Clear existing orders so re-running seed stays idempotent
    await db.orderItem.deleteMany({})
    await db.order.deleteMany({})

    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const buyers = createdUsers.slice(1)

    // Weighted status combos: 50% fulfilled, 25% paid, 15% new, 10% cancelled
    type StatusCombo = {
      status: 'NEW' | 'PAID' | 'FULFILLED' | 'CANCELLED'
      paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED'
      fulfillmentStatus: 'UNFULFILLED' | 'FULFILLED'
    }
    const STATUS_COMBOS: StatusCombo[] = [
      ...Array(5).fill({
        status: 'FULFILLED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
      }),
      ...Array(3).fill({
        status: 'PAID',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
      }),
      ...Array(1).fill({
        status: 'NEW',
        paymentStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
      }),
      ...Array(1).fill({
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        fulfillmentStatus: 'UNFULFILLED',
      }),
    ]

    // Returns a random date within [start, end]
    const randomDate = (start: Date, end: Date): Date =>
      new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      )

    // Returns a random order amount between $50 and $1200
    const randomAmount = (): number =>
      parseFloat((Math.random() * 1150 + 50).toFixed(2))

    let orderSeq = 0

    const seedOrdersInRange = async (
      count: number,
      start: Date,
      end: Date,
      withItems = false
    ) => {
      for (let i = 0; i < count; i++) {
        const user = pick(buyers)
        const combo = pick(STATUS_COMBOS) as StatusCombo
        const createdAt = randomDate(start, end)
        orderSeq++
        const orderNumber = `#ORD-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(orderSeq).padStart(4, '0')}`

        if (withItems) {
          const numItems = Math.floor(Math.random() * 3) + 1
          const selectedItems = Array.from({ length: numItems }, () => ({
            product: pick(createdProducts),
            quantity: Math.floor(Math.random() * 3) + 1,
          }))
          const totalAmount = selectedItems.reduce(
            (s, { product, quantity }) => s + Number(product.price) * quantity,
            0
          )
          await db.order.create({
            data: {
              userId: user.id,
              orderNumber,
              customerName: user.name ?? user.email,
              customerEmail: user.email,
              customerAvatar: user.avatarUrl ?? null,
              ...combo,
              totalAmount: parseFloat(totalAmount.toFixed(2)),
              createdAt,
              updatedAt: createdAt,
              items: {
                create: selectedItems.map(({ product, quantity }) => ({
                  name: product.name,
                  productId: product.id,
                  quantity,
                  unitPrice: product.price,
                })),
              },
            },
          })
        } else {
          await db.order.create({
            data: {
              userId: user.id,
              orderNumber,
              customerName: user.name ?? user.email,
              customerEmail: user.email,
              customerAvatar: user.avatarUrl ?? null,
              ...combo,
              totalAmount: randomAmount(),
              createdAt,
              updatedAt: createdAt,
            },
          })
        }
      }
    }

    const now = new Date()

    // ── Historical years (2020–2023): 60 orders/year, no items needed ──────────
    for (let year = 2020; year <= 2023; year++) {
      const count = 60 + year - 2020 // 60, 61, 62, 63
      await seedOrdersInRange(
        count,
        new Date(year, 0, 1),
        new Date(year, 11, 31, 23, 59, 59)
      )
    }

    // ── Last year (2024): 80 orders spread across all 12 months ────────────────
    await seedOrdersInRange(
      80,
      new Date(2024, 0, 1),
      new Date(2024, 11, 31, 23, 59, 59)
    )

    // ── Current year up to last month: 8 orders/month with items ───────────────
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()
    for (let m = 0; m < thisMonth; m++) {
      await seedOrdersInRange(
        8,
        new Date(thisYear, m, 1),
        new Date(thisYear, m + 1, 0, 23, 59, 59),
        true
      )
    }

    // ── Last 7 days: 4 orders/day with items so the weekly chart has data ──────
    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - d)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      await seedOrdersInRange(4, dayStart, dayEnd, true)
    }

    console.info(`  Seeded ${orderSeq} orders`)
    console.info('\n  Database seeded successfully!\n')
  } catch (error) {
    console.error(error)
  }
}
