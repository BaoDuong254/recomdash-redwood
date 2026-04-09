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

type DeleteOrderDialogProps = {
  open: boolean
  orderNumber?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

const DeleteOrderDialog = ({
  open,
  orderNumber,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteOrderDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Order</AlertDialogTitle>
          <AlertDialogDescription>
            {orderNumber ? (
              <>
                Are you sure you want to delete order{' '}
                <span className="tw-font-semibold tw-text-foreground">
                  {orderNumber}
                </span>
                ?
              </>
            ) : (
              'Are you sure you want to delete this order?'
            )}{' '}
            This action is <span className="tw-font-semibold">permanent</span>{' '}
            and cannot be undone. All associated order items will also be
            removed.
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
            {loading ? 'Deleting…' : 'Delete Order'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteOrderDialog
