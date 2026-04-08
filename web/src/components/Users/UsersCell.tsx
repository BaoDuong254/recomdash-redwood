import type { CellFailureProps, CellSuccessProps } from '@redwoodjs/web'

import UserTable from 'src/components/Users/UserTable'

import type { User } from './types'

// ---------------------------------------------------------------------------
// GraphQL Query
// ---------------------------------------------------------------------------

export const QUERY = gql`
  query UsersQuery(
    $page: Int
    $pageSize: Int
    $search: String
    $role: UserRole
    $status: UserStatus
  ) {
    users(
      page: $page
      pageSize: $pageSize
      search: $search
      role: $role
      status: $status
    ) {
      users {
        id
        name
        email
        role
        status
        avatarUrl
        createdAt
      }
      total
    }
  }
`

// ---------------------------------------------------------------------------
// Cell shape types
// ---------------------------------------------------------------------------

type UsersQueryResult = {
  users: {
    users: User[]
    total: number
  }
}

type CellProps = {
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onTotalChange?: (total: number) => void
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

export const Loading = ({ onEdit, onDelete }: CellProps) => (
  <UserTable users={[]} loading onEdit={onEdit} onDelete={onDelete} />
)

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export const Empty = ({ onEdit, onDelete }: CellProps) => (
  <UserTable users={[]} onEdit={onEdit} onDelete={onDelete} />
)

// ---------------------------------------------------------------------------
// Failure state
// ---------------------------------------------------------------------------

export const Failure = ({ error }: CellFailureProps) => (
  <div className="tw-rounded-md tw-border tw-border-destructive/50 tw-bg-destructive/10 tw-p-4 tw-text-sm tw-text-destructive">
    <p className="tw-font-medium">Failed to load users</p>
    <p className="tw-mt-1 tw-text-xs tw-opacity-80">{error?.message}</p>
  </div>
)

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

export const Success = ({
  users: result,
  onEdit,
  onDelete,
  onTotalChange,
}: CellSuccessProps<UsersQueryResult> & CellProps) => {
  // Report total to parent for pagination
  onTotalChange?.(result.total)

  return <UserTable users={result.users} onEdit={onEdit} onDelete={onDelete} />
}
