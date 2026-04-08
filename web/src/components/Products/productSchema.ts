import { z } from 'zod'

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Name must be 200 characters or less'),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be 50 characters or less')
    .regex(
      /^[A-Z0-9\-_]+$/i,
      'SKU may only contain letters, numbers, hyphens, and underscores'
    ),
  // z.number() — form onChange handlers convert string → number before submission
  price: z
    .number()
    .min(0, 'Price must be 0 or greater')
    .max(1_000_000, 'Price is too high'),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['active', 'draft', 'archived']),
  inventory: z
    .number()
    .int('Inventory must be a whole number')
    .min(0, 'Inventory must be 0 or greater'),
  lowStockThreshold: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Must be 0 or greater'),
  image: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
