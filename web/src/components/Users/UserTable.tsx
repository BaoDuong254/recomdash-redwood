import { Skeleton } from 'src/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table'

import type { User } from './types'
import UserRow from './UserRow'

type UserTableProps = {
  users: User[]
  loading?: boolean
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
}

const SKELETON_ROWS = 5

const TableSkeleton = () => (
  <>
    {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <div className="tw-flex tw-items-center tw-gap-3">
            <Skeleton className="tw-h-9 tw-w-9 tw-rounded-full" />
            <div className="tw-space-y-1.5">
              <Skeleton className="tw-h-4 tw-w-32" />
              <Skeleton className="tw-h-3 tw-w-44" />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-5 tw-w-16 tw-rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-5 tw-w-16 tw-rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-4 tw-w-24" />
        </TableCell>
        <TableCell>
          <Skeleton className="tw-h-8 tw-w-8 tw-rounded-md" />
        </TableCell>
      </TableRow>
    ))}
  </>
)

const EmptyState = () => (
  <TableRow>
    <TableCell colSpan={5} className="tw-py-16 tw-text-center">
      <div className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="tw-h-10 tw-w-10 tw-opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="tw-text-sm tw-font-medium">No users found</p>
        <p className="tw-text-xs">
          Try adjusting your search or filter criteria
        </p>
      </div>
    </TableCell>
  </TableRow>
)

const UserTable = ({
  users,
  loading = false,
  onEdit,
  onDelete,
}: UserTableProps) => {
  return (
    <div className="tw-rounded-md tw-border tw-border-border tw-bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:tw-bg-transparent">
            <TableHead className="tw-min-w-[220px]">User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="tw-w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton />
          ) : users.length === 0 ? (
            <EmptyState />
          ) : (
            users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default UserTable
