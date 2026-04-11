#!/usr/bin/env tsx
/**
 * scripts/order-generator.ts
 *
 * Continuous order generator for realtime end-to-end testing.
 * Creates orders via the RedwoodJS GraphQL API, triggering the full pipeline:
 *
 *   GraphQL mutation → Redis Pub/Sub → Go service → WebSocket → Dashboard UI
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   npx tsx scripts/order-generator.ts
 *   npx tsx scripts/order-generator.ts --speed=fast
 *   npx tsx scripts/order-generator.ts --speed=slow
 *   npx tsx scripts/order-generator.ts --max=20
 *   npx tsx scripts/order-generator.ts --verbose
 *   npx tsx scripts/order-generator.ts --update-status
 *
 * ─── Environment (optional, falls back to defaults) ──────────────────────────
 *
 *   GENERATOR_EMAIL      Login email     (default: admin@example.com)
 *   GENERATOR_PASSWORD   Login password  (default: password)
 *   GENERATOR_API_URL    API base URL    (default: http://localhost:8911)
 */

// ---------------------------------------------------------------------------
// Load .env from project root before reading any process.env values
// ---------------------------------------------------------------------------

import { resolve } from 'path'
import { fileURLToPath } from 'url'

import { config as loadDotenv } from 'dotenv'

// __dirname equivalent for ESM — resolves to the scripts/ directory.
// We go one level up (..) to reach the project root where .env lives.
const __dirname = fileURLToPath(new URL('.', import.meta.url))
loadDotenv({ path: resolve(__dirname, '../.env') })

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = process.env.GENERATOR_API_URL ?? 'http://localhost:8911'
const GRAPHQL_URL = `${API_BASE}/graphql`
const AUTH_URL = `${API_BASE}/auth`

// Self-signed certs (EC2 public DNS without a CA-issued cert) are rejected by
// Node's TLS stack. Disable verification so the generator can reach staging
// deployments. This script is never used in production paths.
if (API_BASE.startsWith('https://')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const LOGIN_EMAIL = process.env.GENERATOR_EMAIL ?? 'emily@example.com'
const LOGIN_PASSWORD = process.env.GENERATOR_PASSWORD ?? 'password'

/** Delay ranges in milliseconds for each speed mode. */
const SPEED_PRESETS: Record<string, [number, number]> = {
  fast: [500, 1500],
  normal: [1500, 5000],
  slow: [5000, 12000],
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2)

function getArg(name: string): string | undefined {
  return rawArgs.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
}

const speed = getArg('speed') ?? 'normal'
const maxOrders = parseInt(getArg('max') ?? '0', 10) // 0 = unlimited
const verbose = rawArgs.includes('--verbose') || rawArgs.includes('-v')
const updateStatus = rawArgs.includes('--update-status')

if (!SPEED_PRESETS[speed]) {
  console.error(`Unknown speed "${speed}". Use: fast | normal | slow`)
  process.exit(1)
}

const [MIN_DELAY, MAX_DELAY] = SPEED_PRESETS[speed]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string
  name: string
  price: number
  status: string
}

interface OrderItemInput {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

interface CreateOrderInput {
  customerName: string
  customerEmail: string
  status: 'NEW'
  paymentStatus: 'PENDING' | 'PAID'
  fulfillmentStatus: 'UNFULFILLED'
  totalAmount: number
  items: OrderItemInput[]
}

interface CreatedOrder {
  id: string
  orderNumber: string
  totalAmount: number
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

// ---------------------------------------------------------------------------
// Random data helpers
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'David',
  'Emma',
  'Frank',
  'Grace',
  'Henry',
  'Iris',
  'James',
  'Karen',
  'Liam',
  'Maya',
  'Noah',
  'Olivia',
  'Peter',
  'Quinn',
  'Rose',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xander',
  'Yara',
  'Zoe',
]

const LAST_NAMES = [
  'Anderson',
  'Brown',
  'Clark',
  'Davis',
  'Evans',
  'Foster',
  'Garcia',
  'Harris',
  'Jackson',
  'King',
  'Lee',
  'Martinez',
  'Nelson',
  'Owens',
  'Parker',
  'Quinn',
  'Roberts',
  'Smith',
  'Taylor',
  'Underwood',
  'Vance',
  'Williams',
  'Young',
  'Zhang',
]

const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'example.com',
  'mail.com',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomCustomer(): { name: string; email: string } {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const name = `${first} ${last}`
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@${pick(EMAIL_DOMAINS)}`
  return { name, email }
}

/** Pick 1–3 distinct products from the available pool and build order items. */
function randomItems(products: Product[]): OrderItemInput[] {
  const count = randInt(1, Math.min(3, products.length))
  const shuffled = [...products].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  return selected.map((p) => {
    const quantity = randInt(1, 3)
    // Add a small price variation (±10%) to simulate discounts/surcharges
    const unitPrice = parseFloat((p.price * randFloat(0.9, 1.1)).toFixed(2))
    return { productId: p.id, name: p.name, quantity, unitPrice }
  })
}

function buildOrderInput(products: Product[]): CreateOrderInput {
  const { name, email } = randomCustomer()
  const items = randomItems(products)
  const totalAmount = parseFloat(
    items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)
  )

  return {
    customerName: name,
    customerEmail: email,
    status: 'NEW',
    paymentStatus: Math.random() < 0.4 ? 'PAID' : 'PENDING',
    fulfillmentStatus: 'UNFULFILLED',
    totalAmount,
    items,
  }
}

// ---------------------------------------------------------------------------
// HTTP / GraphQL client
// ---------------------------------------------------------------------------

/** Accumulated session cookie string sent with every authenticated request. */
let sessionCookie = ''

async function login(): Promise<void> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
      method: 'login',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}): ${body}`)
  }

  // Node 18+ fetch joins multiple Set-Cookie headers with ", " when accessed via
  // get() — which breaks naive comma-splitting because Expires dates also contain
  // commas (e.g. "Expires=Sun, 06 Apr 2036"). getSetCookie() returns each header
  // as its own array entry — the correct API for this.
  //
  // `getSetCookie` is not in the standard lib types yet (Node 18.14+), so we
  // describe it with a local interface rather than casting to `any`.
  interface FetchHeaders extends Headers {
    getSetCookie?(): string[]
  }
  const headers = res.headers as FetchHeaders
  const rawCookies: string[] =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie() // Node 18.14+ native fetch
      : (res.headers.get('set-cookie') ?? '').split('\n') // undici fallback

  // Strip directives (Path, HttpOnly, Expires, SameSite…) — keep only name=value.
  sessionCookie = rawCookies
    .filter(Boolean)
    .map((c) => c.split(';')[0].trim())
    .join('; ')

  if (!sessionCookie) {
    throw new Error(
      'Login succeeded but no session cookie was returned. Check credentials.'
    )
  }

  if (verbose) {
    const names = sessionCookie.split('; ').map((c) => c.split('=')[0])
    console.log(`[auth] cookies acquired: ${names.join(', ')}`)
  }
}

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`GraphQL request failed: HTTP ${res.status}`)
  }

  return res.json() as Promise<GraphQLResponse<T>>
}

// ---------------------------------------------------------------------------
// Product fetcher
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY = `
  query GeneratorGetProducts {
    products(pageSize: 100, status: "ACTIVE") {
      products {
        id
        name
        price
        status
      }
    }
  }
`

async function fetchActiveProducts(): Promise<Product[]> {
  const result = await gql<{ products: { products: Product[] } }>(
    PRODUCTS_QUERY
  )

  if (result.errors?.length) {
    throw new Error(
      `Products query error: ${result.errors.map((e) => e.message).join(', ')}`
    )
  }

  return result.data?.products?.products ?? []
}

// ---------------------------------------------------------------------------
// Order mutations
// ---------------------------------------------------------------------------

const CREATE_ORDER_MUTATION = `
  mutation GeneratorCreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      totalAmount
    }
  }
`

async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const result = await gql<{ createOrder: CreatedOrder }>(
    CREATE_ORDER_MUTATION,
    { input }
  )

  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join(', '))
  }

  const order = result.data?.createOrder
  if (!order) throw new Error('createOrder returned no data')

  return order
}

type OrderStatus = 'NEW' | 'PAID' | 'FULFILLED'

const UPDATE_ORDER_MUTATION = `
  mutation GeneratorUpdateOrder($id: String!, $input: UpdateOrderInput!) {
    updateOrder(id: $id, input: $input) {
      id
      orderNumber
      status
    }
  }
`

async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const result = await gql(UPDATE_ORDER_MUTATION, { id, input: { status } })
  if (result.errors?.length) {
    // Non-fatal: log but don't abort the loop
    console.warn(`  [warn] status update failed: ${result.errors[0].message}`)
  }
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}

function log(msg: string): void {
  const ts = new Date().toLocaleTimeString()
  console.log(`[${ts}] ${msg}`)
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let running = true
let ordersCreated = 0

async function run(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Order Generator — Realtime E2E Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  API:    ${GRAPHQL_URL}`)
  console.log(
    `  Speed:  ${speed}  (${MIN_DELAY}ms – ${MAX_DELAY}ms between orders)`
  )
  console.log(`  Limit:  ${maxOrders > 0 ? maxOrders : 'unlimited'}`)
  console.log(
    `  Extra:  ${updateStatus ? 'status updates ON' : 'status updates OFF'}`
  )
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Step 1: Authenticate
  process.stdout.write('[auth] Logging in… ')
  try {
    await login()
    console.log('OK\n')
  } catch (err) {
    console.error(`FAILED\n\n  ${(err as Error).message}`)
    console.error(
      '\n  Fix: set GENERATOR_EMAIL and GENERATOR_PASSWORD in your .env'
    )
    process.exit(1)
  }

  // Step 2: Fetch products
  process.stdout.write('[init] Fetching active products… ')
  let products: Product[] = []
  try {
    products = await fetchActiveProducts()
    console.log(`found ${products.length}\n`)
  } catch (err) {
    console.error(`ERROR — ${(err as Error).message}\n`)
  }

  if (products.length === 0) {
    console.error(
      '  No ACTIVE products found.\n' +
        '  Run the seed script first:  yarn rw exec seed\n' +
        '  Then set at least one product to ACTIVE status.\n'
    )
    process.exit(1)
  }

  if (verbose) {
    console.log('  Available products:')
    products.forEach((p) => console.log(`    • ${p.name}  ${fmt(p.price)}`))
    console.log()
  }

  console.log('  Generating orders. Press Ctrl+C to stop.\n')

  // Step 3: Continuous loop
  while (running) {
    if (maxOrders > 0 && ordersCreated >= maxOrders) {
      log(`Reached max order limit (${maxOrders}). Stopping.`)
      break
    }

    const input = buildOrderInput(products)

    try {
      const order = await createOrder(input)
      ordersCreated++

      log(
        `[✔] Order ${order.orderNumber}  ${fmt(order.totalAmount)}` +
          `  (${input.paymentStatus})` +
          `  — ${input.items.length} item(s)` +
          `  customer: ${input.customerName}`
      )

      if (verbose) {
        input.items.forEach((item) => {
          console.log(
            `      • ${item.name}  x${item.quantity}  @ ${fmt(item.unitPrice)}`
          )
        })
      }

      // Bonus: optionally advance the order status after a short pause
      if (updateStatus && Math.random() < 0.5) {
        const newStatus = Math.random() < 0.7 ? 'PAID' : 'FULFILLED'
        await sleep(randInt(300, 800))
        await updateOrderStatus(order.id, newStatus)
        log(`    ↳ status updated → ${newStatus}`)
      }
    } catch (err) {
      const message = (err as Error).message
      log(`[✘] Failed to create order: ${message}`)

      // Re-authenticate on auth errors and continue
      if (
        message.includes('not authenticated') ||
        message.includes('credentials')
      ) {
        log('[auth] Re-authenticating…')
        try {
          await login()
          log('[auth] Re-authenticated. Continuing.')
        } catch {
          log('[auth] Re-authentication failed. Stopping.')
          break
        }
      }
    }

    if (!running) break

    const delay = randInt(MIN_DELAY, MAX_DELAY)
    log(`  Next order in ${(delay / 1000).toFixed(1)}s…\n`)
    await sleep(delay)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Done. Created ${ordersCreated} order(s).`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on('SIGINT', () => {
  if (!running) process.exit(0) // Second Ctrl+C: force quit
  console.log(
    '\n\n[signal] Ctrl+C received — finishing current order then stopping…'
  )
  running = false
})

process.on('SIGTERM', () => {
  running = false
})

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

run().catch((err) => {
  console.error('[fatal]', err)
  process.exit(1)
})
