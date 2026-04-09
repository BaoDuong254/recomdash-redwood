import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'

import { Button } from 'src/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'src/components/ui/form'
import { Input } from 'src/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select'
import { Separator } from 'src/components/ui/separator'

import OrderItemsField from './OrderItemsField'
import { orderSchema, type OrderFormValues } from './orderSchema'
import type { Order } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderFormMode = 'create' | 'edit'

export type OrderFormProps = {
  mode: OrderFormMode
  defaultValues?: Partial<Order>
  onSubmit?: (data: OrderFormValues) => void | Promise<void>
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUBMIT_LABELS: Record<OrderFormMode, string> = {
  create: 'Create Order',
  edit: 'Save Changes',
}

function toFormValues(order?: Partial<Order>): OrderFormValues {
  return {
    customerName: order?.customer?.name ?? '',
    customerEmail: order?.customer?.email ?? '',
    customerAvatar: order?.customer?.avatarUrl ?? '',
    status: order?.status ?? 'NEW',
    paymentStatus: order?.paymentStatus ?? 'PENDING',
    fulfillmentStatus: order?.fulfillmentStatus ?? 'UNFULFILLED',
    items:
      order?.items?.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.unitPrice,
        quantity: i.quantity,
      })) ?? [],
  }
}

// ---------------------------------------------------------------------------
// Pricing summary (auto-calculated)
// ---------------------------------------------------------------------------

const TAX_RATE = 0.1

const PricingSummary = () => {
  const items = useWatch<OrderFormValues, 'items'>({ name: 'items' }) ?? []

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  )
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  return (
    <div className="tw-ml-auto tw-w-full tw-max-w-xs tw-space-y-2 tw-pt-2">
      <div className="tw-flex tw-items-center tw-justify-between tw-text-sm tw-text-muted-foreground">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className="tw-flex tw-items-center tw-justify-between tw-text-sm tw-text-muted-foreground">
        <span>Tax (10%)</span>
        <span>${tax.toFixed(2)}</span>
      </div>
      <Separator />
      <div className="tw-flex tw-items-center tw-justify-between tw-text-base tw-font-semibold tw-text-foreground">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderForm
// ---------------------------------------------------------------------------

const OrderForm = ({
  mode,
  defaultValues,
  onSubmit,
  loading = false,
}: OrderFormProps) => {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: toFormValues(defaultValues),
  })

  // Sync when defaultValues change (e.g. after data loads in edit mode)
  useEffect(() => {
    form.reset(toFormValues(defaultValues))
  }, [defaultValues?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit?.(data)
  })

  return (
    // FormProvider makes context available to nested components (OrderItemsField)
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="tw-space-y-6" noValidate>
          {/* ── Customer Info ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="tw-text-base">
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="tw-space-y-4">
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="customerAvatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Order Items ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="tw-text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="tw-space-y-4">
              <OrderItemsField />

              {/* Items validation error (array-level) */}
              {form.formState.errors.items?.root && (
                <p className="tw-text-sm tw-font-medium tw-text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
              {typeof form.formState.errors.items?.message === 'string' && (
                <p className="tw-text-sm tw-font-medium tw-text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}

              <Separator />
              <PricingSummary />
            </CardContent>
          </Card>

          {/* ── Order Status ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="tw-text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fulfillmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fulfillment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fulfillment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UNFULFILLED">Unfulfilled</SelectItem>
                        <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Submit ───────────────────────────────────────────── */}
          <div className="tw-flex tw-justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="tw-min-w-[140px]"
            >
              {loading && <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />}
              {SUBMIT_LABELS[mode]}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}

export default OrderForm
