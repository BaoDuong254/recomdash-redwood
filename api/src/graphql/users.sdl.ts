export const schema = gql`
  enum UserRole {
    ADMIN
    USER
    SELLER
    STAFF
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
  }

  type User {
    id: String!
    name: String
    email: String!
    role: UserRole!
    status: UserStatus!
    avatarUrl: String
    createdAt: DateTime!
  }

  type UsersResult {
    users: [User!]!
    total: Int!
  }

  type Query {
    users(
      page: Int
      pageSize: Int
      search: String
      role: UserRole
      status: UserStatus
    ): UsersResult! @requireAuth
    user(id: String!): User @requireAuth
  }

  input CreateUserInput {
    name: String
    email: String!
    role: UserRole!
    status: UserStatus!
    avatarUrl: String
    password: String
  }

  input UpdateUserInput {
    name: String
    email: String
    role: UserRole
    status: UserStatus
    avatarUrl: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User! @requireAuth
    updateUser(id: String!, input: UpdateUserInput!): User! @requireAuth
    deleteUser(id: String!): User! @requireAuth
  }
`
