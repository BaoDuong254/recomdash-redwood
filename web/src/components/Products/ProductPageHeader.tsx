import { ArrowLeft, Edit, Trash2 } from 'lucide-react'

import { navigate, routes } from '@redwoodjs/router'

import { Button } from 'src/components/ui/button'

type ProductPageHeaderProps = {
  title: string
  subtitle?: string
  showEdit?: boolean
  showDelete?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

const ProductPageHeader = ({
  title,
  subtitle,
  showEdit = false,
  showDelete = false,
  onEdit,
  onDelete,
}: ProductPageHeaderProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div className="tw-flex tw-items-center tw-gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(routes.adminProducts())}
          aria-label="Back to products"
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

      {(showEdit || showDelete) && (
        <div className="tw-flex tw-items-center tw-gap-2 tw-pl-10 sm:tw-pl-0">
          {showEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="tw-h-4 tw-w-4" />
              Edit
            </Button>
          )}
          {showDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="tw-h-4 tw-w-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductPageHeader
