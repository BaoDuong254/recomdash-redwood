import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DeleteProductDialog from 'src/components/Products/DeleteProductDialog'
import ProductForm from 'src/components/Products/ProductForm'
import ProductPageHeader from 'src/components/Products/ProductPageHeader'
import type { ProductFormValues } from 'src/components/Products/productSchema'
import type { Product } from 'src/components/Products/types'
import { Skeleton } from 'src/components/ui/skeleton'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const PRODUCT_QUERY = gql`
  query EditProductQuery($id: String!) {
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

const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProductMutation($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      sku
    }
  }
`

const DELETE_PRODUCT_MUTATION = gql`
  mutation DeleteProductFromEditMutation($id: String!) {
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
        <Skeleton className="tw-h-6 tw-w-40" />
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

type EditProductPageProps = {
  id: string
}

const EditProductPage = ({ id }: EditProductPageProps) => {
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

  const [updateProduct, { loading: updateLoading }] = useMutation(
    UPDATE_PRODUCT_MUTATION,
    {
      onCompleted: ({ updateProduct: updated }) => {
        toast({
          title: 'Product updated',
          description: `"${updated.name}" has been saved successfully.`,
        })
        navigate(routes.adminProduct({ id }))
      },
      onError: (error) => {
        toast({
          title: 'Failed to update product',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

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

  const handleSubmit = async (formData: ProductFormValues) => {
    await updateProduct({
      variables: {
        id,
        input: {
          name: formData.name,
          sku: formData.sku,
          price: formData.price,
          inventory: formData.inventory,
          lowStockThreshold: formData.lowStockThreshold,
          status: formData.status,
          category: formData.category,
          image: formData.image || null,
          description: formData.description || null,
        },
      },
    })
  }

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
        title={`Edit — ${product.name}`}
        description={`Edit product ${product.name}`}
        robots="nofollow"
      />

      <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
        <ProductPageHeader
          title="Edit Product"
          subtitle={product.sku}
          showDelete
          onDelete={() => setDeleteOpen(true)}
        />

        <ProductForm
          mode="edit"
          defaultValues={product}
          onSubmit={handleSubmit}
          loading={updateLoading}
        />
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

export default EditProductPage
