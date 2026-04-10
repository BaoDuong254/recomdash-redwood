import { db } from 'src/lib/db'

// ---------------------------------------------------------------------------
// Time range helpers
// ---------------------------------------------------------------------------

type TimeRange = 'today' | '7d' | '30d' | '12m'

type DateBounds = {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
}

function getDateBounds(timeRange: TimeRange): DateBounds {
  const now = new Date()
  const end = now

  switch (timeRange) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const prevEnd = new Date(start)
      prevEnd.setMilliseconds(-1)
      const prevStart = new Date(prevEnd)
      prevStart.setHours(0, 0, 0, 0)
      return { start, end, prevStart, prevEnd }
    }
    case '7d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      const prevEnd = new Date(start)
      prevEnd.setMilliseconds(-1)
      const prevStart = new Date(now)
      prevStart.setDate(prevStart.getDate() - 14)
      return { start, end, prevStart, prevEnd }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      const prevEnd = new Date(start)
      prevEnd.setMilliseconds(-1)
      const prevStart = new Date(now)
      prevStart.setDate(prevStart.getDate() - 60)
      return { start, end, prevStart, prevEnd }
    }
    case '12m': {
      const start = new Date(now)
      start.setFullYear(start.getFullYear() - 1)
      const prevEnd = new Date(start)
      prevEnd.setMilliseconds(-1)
      const prevStart = new Date(now)
      prevStart.setFullYear(prevStart.getFullYear() - 2)
      return { start, end, prevStart, prevEnd }
    }
    default: {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      const prevEnd = new Date(start)
      prevEnd.setMilliseconds(-1)
      const prevStart = new Date(now)
      prevStart.setDate(prevStart.getDate() - 60)
      return { start, end, prevStart, prevEnd }
    }
  }
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return parseFloat((((current - previous) / previous) * 100).toFixed(1))
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

async function computeMetrics(
  { start, end, prevStart, prevEnd }: DateBounds,
  activeUsers: number
) {
  const [currentOrders, prevOrders] = await Promise.all([
    db.order.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        createdAt: { gte: start, lte: end },
      },
      select: { totalAmount: true },
    }),
    db.order.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      select: { totalAmount: true },
    }),
  ])

  const totalRevenue = currentOrders.reduce(
    (s, o) => s + Number(o.totalAmount),
    0
  )
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.totalAmount), 0)

  const totalOrders = currentOrders.length
  const prevOrderCount = prevOrders.length

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const prevAvgOrderValue =
    prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders,
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    activeUsers,
    revenueTrend: pctChange(totalRevenue, prevRevenue),
    ordersTrend: pctChange(totalOrders, prevOrderCount),
    avgOrderValueTrend: pctChange(avgOrderValue, prevAvgOrderValue),
    activeUsersTrend: 0,
  }
}

// ---------------------------------------------------------------------------
// Sales chart data
// ---------------------------------------------------------------------------

async function getWeeklySales() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      status: { not: 'CANCELLED' },
      createdAt: { gte: start },
    },
    select: { totalAmount: true, createdAt: true },
  })

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const points: { label: string; revenue: number; date: Date }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    points.push({ label: DAY_NAMES[d.getDay()], revenue: 0, date: d })
  }

  for (const order of orders) {
    const od = new Date(order.createdAt)
    for (const pt of points) {
      if (
        od.getFullYear() === pt.date.getFullYear() &&
        od.getMonth() === pt.date.getMonth() &&
        od.getDate() === pt.date.getDate()
      ) {
        pt.revenue += Number(order.totalAmount)
        break
      }
    }
  }

  return points.map(({ label, revenue }) => ({
    label,
    revenue: parseFloat(revenue.toFixed(2)),
  }))
}

async function getMonthlySales() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      status: { not: 'CANCELLED' },
      createdAt: { gte: start },
    },
    select: { totalAmount: true, createdAt: true },
  })

  const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const points: {
    label: string
    revenue: number
    year: number
    month: number
  }[] = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    points.push({
      label: MONTH_NAMES[d.getMonth()],
      revenue: 0,
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }

  for (const order of orders) {
    const od = new Date(order.createdAt)
    for (const pt of points) {
      if (od.getFullYear() === pt.year && od.getMonth() === pt.month) {
        pt.revenue += Number(order.totalAmount)
        break
      }
    }
  }

  return points.map(({ label, revenue }) => ({
    label,
    revenue: parseFloat(revenue.toFixed(2)),
  }))
}

async function getYearlySales() {
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 5
  const start = new Date(startYear, 0, 1)

  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      status: { not: 'CANCELLED' },
      createdAt: { gte: start },
    },
    select: { totalAmount: true, createdAt: true },
  })

  const points: { label: string; revenue: number; year: number }[] = []
  for (let y = startYear; y <= currentYear; y++) {
    points.push({ label: String(y), revenue: 0, year: y })
  }

  for (const order of orders) {
    const y = new Date(order.createdAt).getFullYear()
    const pt = points.find((p) => p.year === y)
    if (pt) pt.revenue += Number(order.totalAmount)
  }

  return points.map(({ label, revenue }) => ({
    label,
    revenue: parseFloat(revenue.toFixed(2)),
  }))
}

// ---------------------------------------------------------------------------
// Order status breakdown
// ---------------------------------------------------------------------------

async function getOrderStatus(start: Date, end: Date) {
  const dateFilter = { gte: start, lte: end }
  const [fulfilled, paid, newCount, cancelled] = await Promise.all([
    db.order.count({
      where: { deletedAt: null, status: 'FULFILLED', createdAt: dateFilter },
    }),
    db.order.count({
      where: { deletedAt: null, status: 'PAID', createdAt: dateFilter },
    }),
    db.order.count({
      where: { deletedAt: null, status: 'NEW', createdAt: dateFilter },
    }),
    db.order.count({
      where: { deletedAt: null, status: 'CANCELLED', createdAt: dateFilter },
    }),
  ])

  return [
    { label: 'Fulfilled', value: fulfilled, color: '#22c55e' },
    { label: 'Paid', value: paid, color: '#3b82f6' },
    { label: 'New', value: newCount, color: '#a855f7' },
    { label: 'Cancelled', value: cancelled, color: '#ef4444' },
  ]
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// All-time stats — no time-range filter, mirrors Go's all-time projection
// ---------------------------------------------------------------------------

export const allTimeStats = async () => {
  const orders = await db.order.findMany({
    where: { deletedAt: null },
    select: { totalAmount: true },
  })

  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders,
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
  }
}

export const dashboardStats = async ({ timeRange }: { timeRange: string }) => {
  const bounds = getDateBounds(timeRange as TimeRange)

  const [activeUsers, weeklySales, monthlySales, yearlySales, orderStatus] =
    await Promise.all([
      db.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      getWeeklySales(),
      getMonthlySales(),
      getYearlySales(),
      getOrderStatus(bounds.start, bounds.end),
    ])

  const metrics = await computeMetrics(bounds, activeUsers)

  return { metrics, weeklySales, monthlySales, yearlySales, orderStatus }
}
