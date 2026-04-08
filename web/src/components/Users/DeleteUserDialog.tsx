import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'src/components/ui/alert-dialog'
import { buttonVariants } from 'src/components/ui/button'
import { cn } from 'src/lib/utils'

type DeleteUserDialogProps = {
  open: boolean
  userName?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

const DeleteUserDialog = ({
  open,
  userName,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteUserDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            {userName ? (
              <span className="tw-font-semibold tw-text-foreground">
                {userName}
              </span>
            ) : (
              'this user'
            )}
            ? This action is <span className="tw-font-semibold">permanent</span>{' '}
            and cannot be undone. All associated data will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={loading}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            {loading ? 'Deleting…' : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteUserDialog
