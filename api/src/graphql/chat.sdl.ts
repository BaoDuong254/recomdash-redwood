export const schema = gql`
  type ChatResponse {
    reply: String!
    # JSON-serialised result data (product list, metrics snapshot, etc.)
    # Frontend parses this for rich rendering; may be null for write operations.
    data: String
    success: Boolean!
    requiresConfirmation: Boolean!
    confirmationToken: String
  }

  input ChatHistoryItem {
    role: String!
    content: String!
  }

  input ChatMessageInput {
    message: String!
    # Pass the last few turns so Gemini has context for follow-up questions.
    history: [ChatHistoryItem!]
    # Non-null when the admin confirms a pending destructive action.
    confirmationToken: String
  }

  type Mutation {
    chatMessage(input: ChatMessageInput!): ChatResponse!
      @requireAuth(roles: ["ADMIN"])
  }
`
