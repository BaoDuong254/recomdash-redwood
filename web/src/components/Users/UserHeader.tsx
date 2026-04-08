import { UserPlus } from 'lucide-react'

import { Button } from 'src/components/ui/button'

type UserHeaderProps = {
  onAddUser?: () => void
}

const UserHeader = ({ onAddUser }: UserHeaderProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div>
        <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
          User Management
        </h1>
        <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
          Manage admin accounts, staff, and customers
        </p>
      </div>
      <Button size="sm" onClick={onAddUser}>
        <UserPlus className="tw-h-4 tw-w-4" />
        Add User
      </Button>
    </div>
  )
}

export default UserHeader
