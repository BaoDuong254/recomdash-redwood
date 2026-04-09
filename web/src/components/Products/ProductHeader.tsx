import { Download, Loader2, Plus } from 'lucide-react'

import { Button } from 'src/components/ui/button'

type ProductHeaderProps = {
  onExport?: () => void
  exportLoading?: boolean
  onAddProduct?: () => void
}

const ProductHeader = ({
  onExport,
  exportLoading,
  onAddProduct,
}: ProductHeaderProps) => {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div>
        <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
          Product Management
        </h1>
        <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
          Manage your product catalog, inventory, and pricing
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
          {exportLoading ? 'Exporting…' : 'Export CSV'}
        </Button>
        <Button size="sm" onClick={onAddProduct}>
          <Plus className="tw-h-4 tw-w-4" />
          Add Product
        </Button>
      </div>
    </div>
  )
}

export default ProductHeader
