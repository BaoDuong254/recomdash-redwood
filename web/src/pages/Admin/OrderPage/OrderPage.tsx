import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import DeleteOrderDialog from 'src/components/Orders/DeleteOrderDialog'
import { MOCK_ORDERS } from 'src/components/Orders/mockData'
import OrderPageHeader from 'src/components/Orders/OrderPageHeader'
import OrderSummary from 'src/components/Orders/OrderSummary'
import OrderTimeline from 'src/components/Orders/OrderTimeline'
import { useToast } from 'src/hooks/use-toast'

type OrderPageProps = {
  id: string
}

const OrderPage = ({ id }: OrderPageProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { toast } = useToast()

  // TODO: replace with a RedwoodJS Cell / GraphQL query
  const order = MOCK_ORDERS.find((o) => o.id === id)

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      // TODO: replace with GraphQL mutation
      // await deleteOrder({ variables: { id } })
      console.log('Deleting order:', id)
      await new Promise((r) => setTimeout(r, 600))

      toast({
        title: 'Order deleted',
        description: `${order?.orderNumber ?? 'Order'} has been removed.`,
      })
      setDeleteOpen(false)
      navigate(routes.adminOrders())
    } catch {
      toast({
        title: 'Failed to delete order',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!order) {
    return (
      <div className="tw-mx-auto tw-max-w-3xl tw-py-16 tw-text-center tw-text-muted-foreground">
        <p className="tw-text-lg tw-font-medium">Order not found</p>
        <p className="tw-mt-1 tw-text-sm">
          The order with ID <code>{id}</code> does not exist.
        </p>
      </div>
    )
  }

  return (
    <>
      <Metadata
        title={`${order.orderNumber} — Order Details`}
        description={`View details for order ${order.orderNumber}`}
        robots="nofollow"
      />

      <div className="tw-mx-auto tw-max-w-3xl tw-space-y-6">
        <OrderPageHeader
          title={order.orderNumber}
          subtitle={`Placed by ${order.customer.name ?? order.customer.email}`}
          showDelete
          onDelete={() => setDeleteOpen(true)}
        />

        <div className="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-3">
          {/* Main content — summary + items */}
          <div className="tw-space-y-6 lg:tw-col-span-2">
            <OrderSummary order={order} />
          </div>

          {/* Sidebar — timeline */}
          <div className="tw-lg:col-span-1">
            <OrderTimeline order={order} />
          </div>
        </div>
      </div>

      <DeleteOrderDialog
        open={deleteOpen}
        orderNumber={order.orderNumber}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </>
  )
}

export default OrderPage
