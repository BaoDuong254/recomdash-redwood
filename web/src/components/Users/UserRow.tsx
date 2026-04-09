import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'

import { Button } from 'src/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import { UserRoleBadge, UserStatusBadge } from 'src/components/ui/status-badge'
import { TableCell, TableRow } from 'src/components/ui/table'

import type { User } from './types'

type UserRowProps = {
  user: User
  isSelf?: boolean
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
}

const UserAvatar = ({
  user,
}: {
  user: Pick<User, 'name' | 'email' | 'avatarUrl'>
}) => {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="tw-h-9 tw-w-9 tw-shrink-0 tw-rounded-full tw-border tw-border-border tw-object-cover"
      />
    )
  }

  return (
    <div className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-primary/10 tw-text-sm tw-font-semibold tw-text-primary">
      {initials}
    </div>
  )
}

const UserRow = ({ user, isSelf = false, onEdit, onDelete }: UserRowProps) => {
  const createdDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <TableRow className="tw-group tw-transition-colors">
      {/* Avatar + Name + Email */}
      <TableCell>
        <div className="tw-flex tw-items-center tw-gap-3">
          <UserAvatar user={user} />
          <div className="tw-min-w-0">
            <div className="tw-flex tw-items-center tw-gap-2">
              <p className="tw-truncate tw-text-sm tw-font-semibold tw-text-foreground">
                {user.name ?? '—'}
              </p>
              {isSelf && (
                <span className="tw-shrink-0 tw-rounded tw-bg-primary/10 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-medium tw-text-primary">
                  You
                </span>
              )}
            </div>
            <p className="tw-truncate tw-text-xs tw-text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Role */}
      <TableCell>
        <UserRoleBadge role={user.role} />
      </TableCell>

      {/* Status */}
      <TableCell>
        <UserStatusBadge status={user.status} />
      </TableCell>

      {/* Created */}
      <TableCell className="tw-text-sm tw-text-muted-foreground">
        {createdDate}
      </TableCell>

      {/* Actions */}
      <TableCell className="tw-w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="tw-h-8 tw-w-8 tw-opacity-0 focus:tw-opacity-100 group-hover:tw-opacity-100"
              aria-label="User actions"
            >
              <MoreHorizontal className="tw-h-4 tw-w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="tw-w-40">
            <DropdownMenuItem onClick={() => onEdit?.(user)}>
              <Edit className="tw-mr-2 tw-h-4 tw-w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => !isSelf && onDelete?.(user)}
              disabled={isSelf}
              className={
                isSelf
                  ? 'tw-cursor-not-allowed tw-opacity-50'
                  : 'tw-text-destructive focus:tw-text-destructive'
              }
              title={isSelf ? 'You cannot delete your own account' : undefined}
            >
              <Trash2 className="tw-mr-2 tw-h-4 tw-w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export { UserAvatar }
export default UserRow
