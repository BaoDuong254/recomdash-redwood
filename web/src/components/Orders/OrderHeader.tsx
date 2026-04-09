import { Download, Loader2, Plus } from 'lucide-react'

import { Button } from 'src/components/ui/button'

type OrderHeaderProps = {
  onExport?: () => void
  exportLoading?: boolean
  onCreateOrder?: () => void
}

const OrderHeader = ({
  onExport,
  exportLoading = false,
  onCreateOrder,
}: OrderHeaderProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div>
        <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
          Orders
        </h1>
        <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
          Manage and track all customer orders
        </p>
      </div>

      <div className="tw-flex tw-items-center tw-gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exportLoading}
        >
          {exportLoading ? (
            <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
          ) : (
            <Download className="tw-h-4 tw-w-4" />
          )}
          Export
        </Button>
        <Button size="sm" onClick={onCreateOrder}>
          <Plus className="tw-h-4 tw-w-4" />
          Create Order
        </Button>
      </div>
    </div>
  )
}

export default OrderHeader
