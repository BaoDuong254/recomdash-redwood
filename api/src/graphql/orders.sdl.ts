export const schema = gql`
  enum OrderStatus {
    NEW
    PAID
    FULFILLED
    CANCELLED
  }

  enum PaymentStatus {
    PENDING
    PAID
    REFUNDED
  }

  enum FulfillmentStatus {
    UNFULFILLED
    FULFILLED
  }

  type OrderCustomer {
    id: String!
    name: String
    email: String!
    avatarUrl: String
  }

  type OrderItem {
    id: String!
    productId: String!
    name: String!
    quantity: Int!
    unitPrice: Float!
  }

  type Order {
    id: String!
    orderNumber: String!
    status: OrderStatus!
    paymentStatus: PaymentStatus!
    fulfillmentStatus: FulfillmentStatus!
    totalAmount: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
    customer: OrderCustomer!
    items: [OrderItem!]!
  }

  type OrdersResult {
    orders: [Order!]!
    total: Int!
  }

  type OrderStats {
    total: Int!
    new: Int!
    paid: Int!
    fulfilled: Int!
    cancelled: Int!
  }

  type Query {
    orders(
      page: Int
      pageSize: Int
      search: String
      status: OrderStatus
      paymentStatus: PaymentStatus
    ): OrdersResult! @requireAuth
    order(id: String!): Order @requireAuth
    orderStats: OrderStats! @requireAuth
    exportOrders(
      search: String
      status: OrderStatus
      paymentStatus: PaymentStatus
    ): [Order!]! @requireAuth
  }

  input OrderItemInput {
    productId: String!
    name: String!
    quantity: Int!
    unitPrice: Float!
  }

  input CreateOrderInput {
    customerName: String!
    customerEmail: String!
    customerAvatar: String
    status: OrderStatus!
    paymentStatus: PaymentStatus!
    fulfillmentStatus: FulfillmentStatus!
    totalAmount: Float!
    items: [OrderItemInput!]!
  }

  input UpdateOrderInput {
    status: OrderStatus
    paymentStatus: PaymentStatus
    fulfillmentStatus: FulfillmentStatus
    totalAmount: Float
  }

  type Mutation {
    createOrder(input: CreateOrderInput!): Order! @requireAuth
    updateOrder(id: String!, input: UpdateOrderInput!): Order! @requireAuth
    deleteOrder(id: String!): Order! @requireAuth
  }
`
