export const schema = gql`
  type DashboardMetric {
    totalRevenue: Float!
    totalOrders: Int!
    avgOrderValue: Float!
    activeUsers: Int!
    revenueTrend: Float!
    ordersTrend: Float!
    avgOrderValueTrend: Float!
    activeUsersTrend: Float!
  }

  type SalesPoint {
    label: String!
    revenue: Float!
  }

  type OrderStatusBreakdown {
    label: String!
    value: Int!
    color: String!
  }

  type DashboardStats {
    metrics: DashboardMetric!
    weeklySales: [SalesPoint!]!
    monthlySales: [SalesPoint!]!
    yearlySales: [SalesPoint!]!
    orderStatus: [OrderStatusBreakdown!]!
  }

  # All-time KPI totals — not scoped to any time range.
  # Used by the frontend as a GraphQL baseline for the KPI cards while the
  # Go realtime projection is bootstrapping.  Mirrors Go's all-time semantics.
  type AllTimeStats {
    totalRevenue: Float!
    totalOrders: Int!
    avgOrderValue: Float!
  }

  type Query {
    dashboardStats(timeRange: String!): DashboardStats! @requireAuth
    allTimeStats: AllTimeStats! @requireAuth
  }
`
