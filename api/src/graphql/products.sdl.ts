export const schema = gql`
  type Product {
    id: String!
    name: String!
    sku: String!
    price: Float!
    inventory: Int!
    lowStockThreshold: Int!
    status: String!
    category: String!
    image: String!
    description: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProductsResult {
    products: [Product!]!
    total: Int!
  }

  type Query {
    products(
      page: Int
      pageSize: Int
      search: String
      category: String
      status: String
      inventoryFilter: String
    ): ProductsResult! @requireAuth
    product(id: String!): Product @requireAuth
    exportProducts(
      search: String
      category: String
      status: String
      inventoryFilter: String
    ): [Product!]! @requireAuth
  }

  input CreateProductInput {
    name: String!
    sku: String!
    price: Float!
    inventory: Int!
    lowStockThreshold: Int!
    status: String!
    category: String!
    image: String
    description: String
  }

  input UpdateProductInput {
    name: String
    sku: String
    price: Float
    inventory: Int
    lowStockThreshold: Int
    status: String
    category: String
    image: String
    description: String
  }

  type Mutation {
    createProduct(input: CreateProductInput!): Product! @requireAuth
    updateProduct(id: String!, input: UpdateProductInput!): Product!
      @requireAuth
    deleteProduct(id: String!): Product! @requireAuth
  }
`
