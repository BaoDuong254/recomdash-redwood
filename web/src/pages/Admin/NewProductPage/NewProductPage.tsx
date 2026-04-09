import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import ProductForm from 'src/components/Products/ProductForm'
import ProductPageHeader from 'src/components/Products/ProductPageHeader'
import type { ProductFormValues } from 'src/components/Products/productSchema'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProductMutation($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      sku
    }
  }
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewProductPage = () => {
  const { toast } = useToast()

  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT_MUTATION, {
    onCompleted: ({ createProduct: created }) => {
      toast({
        title: 'Product created',
        description: `"${created.name}" has been added to your catalog.`,
      })
      navigate(routes.adminProducts())
    },
    onError: (error) => {
      toast({
        title: 'Failed to create product',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: ProductFormValues) => {
    await createProduct({
      variables: {
        input: {
          name: data.name,
          sku: data.sku,
          price: data.price,
          inventory: data.inventory,
          lowStockThreshold: data.lowStockThreshold,
          status: data.status,
          category: data.category,
          image: data.image || null,
          description: data.description || null,
        },
      },
    })
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
