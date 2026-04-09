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

  type Query {
    dashboardStats(timeRange: String!): DashboardStats! @requireAuth
  }
`
