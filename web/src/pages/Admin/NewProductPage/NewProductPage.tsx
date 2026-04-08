import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import ProductForm from 'src/components/Products/ProductForm'
import ProductPageHeader from 'src/components/Products/ProductPageHeader'
import type { ProductFormValues } from 'src/components/Products/productSchema'
import { useToast } from 'src/hooks/use-toast'

const NewProductPage = () => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (data: ProductFormValues) => {
    setLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      // await createProduct({ variables: { input: data } })
      console.log('Creating product:', data)
      await new Promise((r) => setTimeout(r, 800)) // simulate async

      toast({
        title: 'Product created',
        description: `"${data.name}" has been added to your catalog.`,
      })
      navigate(routes.adminProducts())
    } catch {
      toast({
        title: 'Failed to create product',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Metadata
        title="Add Product"
        description="Add a new product to your catalog"
        robots="nofollow"
      />
      <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
        <ProductPageHeader
          title="Add Product"
          subtitle="Fill in the details to add a new product to your catalog"
        />
        <ProductForm mode="create" onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  )
}

export default NewProductPage
