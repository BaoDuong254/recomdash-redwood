import { ArrowLeft, Trash2 } from 'lucide-react'

import { navigate, routes } from '@redwoodjs/router'

import { Button } from 'src/components/ui/button'

type OrderPageHeaderProps = {
  title: string
  subtitle?: string
  showDelete?: boolean
  onDelete?: () => void
}

const OrderPageHeader = ({
  title,
  subtitle,
  showDelete = false,
  onDelete,
}: OrderPageHeaderProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div className="tw-flex tw-items-center tw-gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(routes.adminOrders())}
          aria-label="Back to orders"
          className="tw-shrink-0"
        >
          <ArrowLeft className="tw-h-4 tw-w-4" />
        </Button>
        <div>
          <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="tw-mt-0.5 tw-text-sm tw-text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {showDelete && (
        <div className="tw-flex tw-items-center tw-gap-2 tw-pl-10 sm:tw-pl-0">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="tw-h-4 tw-w-4" />
            Delete Order
          </Button>
        </div>
      )}
    </div>
  )
}

export default OrderPageHeader
