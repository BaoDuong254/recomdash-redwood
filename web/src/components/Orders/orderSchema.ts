import { z } from 'zod'

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  name: z.string().min(1, 'Product name is required'),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price must be 0 or greater'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
})

export const orderSchema = z.object({
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(100, 'Name must be 100 characters or less'),
  customerEmail: z.string().email('Must be a valid email address'),
  customerAvatar: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional(),
  status: z.enum(['NEW', 'PAID', 'FULFILLED', 'CANCELLED']),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED']),
  fulfillmentStatus: z.enum(['UNFULFILLED', 'FULFILLED']),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
})

export type OrderItemFormValue = z.infer<typeof orderItemSchema>
export type OrderFormValues = z.infer<typeof orderSchema>
