import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import OrderForm from 'src/components/Orders/OrderForm'
import OrderPageHeader from 'src/components/Orders/OrderPageHeader'
import type { OrderFormValues } from 'src/components/Orders/orderSchema'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrderMutation($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
    }
  }
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewOrderPage = () => {
  const { toast } = useToast()

  const [createOrder, { loading }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: ({ createOrder: created }) => {
      toast({
        title: 'Order created',
        description: `${created.orderNumber} has been created successfully.`,
      })
      navigate(routes.adminOrders())
    },
    onError: (error) => {
      toast({
        title: 'Failed to create order',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: OrderFormValues) => {
    const subtotal = data.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    )
    const totalAmount = parseFloat((subtotal * 1.1).toFixed(2))

    await createOrder({
      variables: {
        input: {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerAvatar: data.customerAvatar || null,
          status: data.status,
          paymentStatus: data.paymentStatus,
          fulfillmentStatus: data.fulfillmentStatus,
          totalAmount,
          items: data.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        },
      },
    })
  }

  return (
    <>
      <Metadata
        title="Create Order"
        description="Create a new customer order"
        robots="nofollow"
      />
      <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
        <OrderPageHeader
          title="Create Order"
          subtitle="Fill in the details to create a new customer order"
        />
        <OrderForm mode="create" onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  )
}

export default NewOrderPage
