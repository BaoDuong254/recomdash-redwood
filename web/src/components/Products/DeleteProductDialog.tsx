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

type DeleteProductDialogProps = {
  open: boolean
  productName?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

const DeleteProductDialog = ({
  open,
  productName,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteProductDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            {productName ? (
              <>
                Are you sure you want to delete{' '}
                <span className="tw-font-semibold tw-text-foreground">
                  {productName}
                </span>
                ?
              </>
            ) : (
              'Are you sure you want to delete this product?'
            )}{' '}
            This action is <span className="tw-font-semibold">permanent</span>{' '}
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
            {loading ? 'Deleting…' : 'Delete Product'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteProductDialog
