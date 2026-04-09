import { useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DeleteOrderDialog from 'src/components/Orders/DeleteOrderDialog'
import OrderPageHeader from 'src/components/Orders/OrderPageHeader'
import OrderSummary from 'src/components/Orders/OrderSummary'
import OrderTimeline from 'src/components/Orders/OrderTimeline'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const ORDER_QUERY = gql`
  query OrderDetailQuery($id: String!) {
    order(id: $id) {
      id
      orderNumber
      status
      paymentStatus
      fulfillmentStatus
      totalAmount
      createdAt
      updatedAt
      customer {
        id
        name
        email
        avatarUrl
      }
      items {
        id
        productId
        name
        quantity
        unitPrice
      }
    }
  }
`

const DELETE_ORDER_MUTATION = gql`
  mutation DeleteOrderFromDetailMutation($id: String!) {
    deleteOrder(id: $id) {
      id
      orderNumber
    }
  }
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type OrderPageProps = {
  id: string
}

const OrderPage = ({ id }: OrderPageProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast } = useToast()

  const { data, loading } = useQuery(ORDER_QUERY, {
    variables: { id },
    onError: (error) => {
      toast({
        title: 'Failed to load order',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [deleteOrder, { loading: deleteLoading }] = useMutation(
    DELETE_ORDER_MUTATION,
    {
      onCompleted: ({ deleteOrder: deleted }) => {
        toast({
          title: 'Order deleted',
          description: `${deleted.orderNumber} has been removed.`,
        })
        setDeleteOpen(false)
        navigate(routes.adminOrders())
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete order',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  const handleDelete = async () => {
    await deleteOrder({ variables: { id } })
  }

  if (loading) {
    return (
      <div className="tw-mx-auto tw-max-w-3xl tw-py-16 tw-text-center tw-text-muted-foreground">
        <p className="tw-text-sm">Loading order details…</p>
      </div>
    )
  }

  const order = data?.order

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
