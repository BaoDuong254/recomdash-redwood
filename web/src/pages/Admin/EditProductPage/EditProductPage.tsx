import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import DeleteProductDialog from 'src/components/Products/DeleteProductDialog'
import { MOCK_PRODUCTS } from 'src/components/Products/mockData'
import ProductForm from 'src/components/Products/ProductForm'
import ProductPageHeader from 'src/components/Products/ProductPageHeader'
import type { ProductFormValues } from 'src/components/Products/productSchema'
import { useToast } from 'src/hooks/use-toast'

type EditProductPageProps = {
  id: string
}

const EditProductPage = ({ id }: EditProductPageProps) => {
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { toast } = useToast()

  // TODO: replace with a RedwoodJS Cell / GraphQL query
  const product = MOCK_PRODUCTS.find((p) => p.id === id)

  const handleSubmit = async (data: ProductFormValues) => {
    setLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      // await updateProduct({ variables: { id, input: data } })
      console.log('Updating product:', id, data)
      await new Promise((r) => setTimeout(r, 800))

      toast({
        title: 'Product updated',
        description: `"${data.name}" has been saved successfully.`,
      })
      navigate(routes.adminProduct({ id }))
    } catch {
      toast({
        title: 'Failed to update product',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      console.log('Deleting product:', id)
      await new Promise((r) => setTimeout(r, 600))

      toast({
        title: 'Product deleted',
        description: `"${product?.name}" has been removed from your catalog.`,
      })
      setDeleteOpen(false)
      navigate(routes.adminProducts())
    } catch {
      toast({
        title: 'Failed to delete product',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

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
          loading={loading}
        />
      </div>

      <DeleteProductDialog
        open={deleteOpen}
        productName={product.name}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}

export default EditProductPage
