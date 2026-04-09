import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import OrderForm from 'src/components/Orders/OrderForm'
import OrderPageHeader from 'src/components/Orders/OrderPageHeader'
import type { OrderFormValues } from 'src/components/Orders/orderSchema'
import { useToast } from 'src/hooks/use-toast'

const NewOrderPage = () => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (data: OrderFormValues) => {
    setLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      // const orderNumber = `#ORD-${Date.now()}`
      // const total = data.items.reduce((s, i) => s + i.price * i.quantity, 0) * 1.1
      // await createOrder({ variables: { input: { ...data, orderNumber, totalAmount: total, userId: '...' } } })
      console.log('Creating order:', data)
      await new Promise((r) => setTimeout(r, 800))

      toast({
        title: 'Order created',
        description: `A new order has been created for ${data.customerName}.`,
      })
      navigate(routes.adminOrders())
    } catch {
      toast({
        title: 'Failed to create order',
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
