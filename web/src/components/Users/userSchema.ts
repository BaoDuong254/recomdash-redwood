import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Must be a valid email address'),
  role: z.enum(['ADMIN', 'USER', 'SELLER', 'STAFF']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
})

export type UserFormValues = z.infer<typeof userSchema>
