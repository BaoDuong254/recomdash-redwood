export const schema = gql`
  type ProductSearchResult {
    id: String!
    name: String!
    sku: String!
    category: String!
    price: Float!
    status: String!
  }

  type OrderSearchResult {
    id: String!
    orderNumber: String!
    customerName: String
    customerEmail: String
    status: String!
    totalAmount: Float!
  }

  type GlobalSearchResults {
    products: [ProductSearchResult!]!
    orders: [OrderSearchResult!]!
  }

  type Query {
    globalSearch(query: String!): GlobalSearchResults! @requireAuth
  }
`
