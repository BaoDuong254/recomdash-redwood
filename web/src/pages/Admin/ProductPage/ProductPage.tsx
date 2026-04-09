import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DeleteProductDialog from 'src/components/Products/DeleteProductDialog'
import ProductForm from 'src/components/Products/ProductForm'
import ProductPageHeader from 'src/components/Products/ProductPageHeader'
import type { Product } from 'src/components/Products/types'
import { Skeleton } from 'src/components/ui/skeleton'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const PRODUCT_QUERY = gql`
  query ProductPageQuery($id: String!) {
    product(id: $id) {
      id
      name
      sku
      price
      inventory
      lowStockThreshold
      status
      category
      image
      description
    }
  }
`

const DELETE_PRODUCT_MUTATION = gql`
  mutation DeleteProductFromViewMutation($id: String!) {
    deleteProduct(id: $id) {
      id
      name
    }
  }
`

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const PageSkeleton = () => (
  <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
    <div className="tw-flex tw-items-center tw-gap-3">
      <Skeleton className="tw-h-9 tw-w-9 tw-rounded-md" />
      <div className="tw-space-y-1.5">
        <Skeleton className="tw-h-6 tw-w-48" />
        <Skeleton className="tw-h-4 tw-w-24" />
      </div>
    </div>
    <Skeleton className="tw-h-64 tw-rounded-lg" />
    <Skeleton className="tw-h-32 tw-rounded-lg" />
    <Skeleton className="tw-h-24 tw-rounded-lg" />
  </div>
)

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type ProductPageProps = {
  id: string
}

const ProductPage = ({ id }: ProductPageProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const { data, loading: queryLoading } = useQuery(PRODUCT_QUERY, {
    variables: { id },
    onError: (error) => {
      toast({
        title: 'Failed to load product',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [deleteProduct, { loading: deleteLoading }] = useMutation(
    DELETE_PRODUCT_MUTATION,
    {
      onCompleted: ({ deleteProduct: deleted }) => {
        toast({
          title: 'Product deleted',
          description: `"${deleted.name}" has been removed from your catalog.`,
        })
        navigate(routes.adminProducts())
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete product',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  if (queryLoading) return <PageSkeleton />

  const product: Product | null = data?.product ?? null

  if (!product) {
    return (
      <div className="tw-mx-auto tw-max-w-3xl tw-py-16 tw-text-center tw-text-muted-foreground">
        <p className="tw-text-lg tw-font-medium">Product not found</p>
        <p className="tw-mt-1 tw-text-sm">
          The product with ID <code>{id}</code> does not exist.
        </p>
      </div>
    )
  }

  return (
    <>
      <Metadata
        title={`${product.name} — Product Details`}
        description={`View details for ${product.name}`}
        robots="nofollow"
      />

      <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
        <ProductPageHeader
          title="Product Details"
          subtitle={product.sku}
          showEdit
          showDelete
          onEdit={() => navigate(routes.adminEditProduct({ id }))}
          onDelete={() => setDeleteOpen(true)}
        />

        <ProductForm mode="view" defaultValues={product} />
      </div>

      <DeleteProductDialog
        open={deleteOpen}
        productName={product.name}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteProduct({ variables: { id } })}
        loading={deleteLoading}
      />
    </>
  )
}

export default ProductPage
