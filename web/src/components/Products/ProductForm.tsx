import { useEffect, useRef, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

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
  FormDescription,
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
import { ProductStatusBadge } from 'src/components/ui/status-badge'
import { Textarea } from 'src/components/ui/textarea'

import { CATEGORY_OPTIONS } from './mockData'
import ProductImageUpload from './ProductImageUpload'
import { productSchema, type ProductFormValues } from './productSchema'
import type { Product } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductFormMode = 'create' | 'edit' | 'view'

export type ProductFormProps = {
  mode: ProductFormMode
  defaultValues?: Partial<Product>
  onSubmit?: (data: ProductFormValues) => void | Promise<void>
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUBMIT_LABELS: Record<Exclude<ProductFormMode, 'view'>, string> = {
  create: 'Create Product',
  edit: 'Save Changes',
}

const CATEGORY_SELECT_OPTIONS = CATEGORY_OPTIONS.filter(
  (c) => c !== 'All Categories'
)

function toFormValues(product?: Partial<Product>): ProductFormValues {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    price: product?.price ?? 0,
    category: product?.category ?? '',
    status: product?.status ?? 'draft',
    inventory: product?.inventory ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 10,
    image: product?.image ?? '',
    description: '',
  }
}

// ---------------------------------------------------------------------------
// Image Preview
// ---------------------------------------------------------------------------

const ImagePreview = ({
  url,
  name,
}: {
  url: string | undefined
  name: string | undefined
}) => {
  const [error, setError] = useState(false)
  const prevUrl = useRef(url)

  useEffect(() => {
    if (url !== prevUrl.current) {
      setError(false)
      prevUrl.current = url
    }
  }, [url])

  if (!url || error) {
    return (
      <div className="tw-flex tw-h-24 tw-w-24 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-dashed tw-border-border tw-bg-muted">
        <ImageIcon className="tw-h-8 tw-w-8 tw-text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={name || 'Product image'}
      onError={() => setError(true)}
      className="tw-h-24 tw-w-24 tw-rounded-lg tw-border tw-border-border tw-object-cover"
    />
  )
}

// ---------------------------------------------------------------------------
// Read-only field (view mode)
// ---------------------------------------------------------------------------

const ViewField = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="tw-space-y-1.5">
    <p className="tw-text-sm tw-font-medium tw-text-foreground">{label}</p>
    <p className="tw-text-sm tw-text-muted-foreground">{value || '—'}</p>
  </div>
)

// ---------------------------------------------------------------------------
// ProductForm
// ---------------------------------------------------------------------------

const ProductForm = ({
  mode,
  defaultValues,
  onSubmit,
  loading = false,
}: ProductFormProps) => {
  const isView = mode === 'view'

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(defaultValues),
  })

  // Sync external defaultValues changes (e.g. after data loads)
  useEffect(() => {
    form.reset(toFormValues(defaultValues))
  }, [defaultValues?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit?.(data)
  })

  // ---- View mode ----
  if (isView) {
    const vals = toFormValues(defaultValues)
    return (
      <div className="tw-space-y-6">
        {/* Image + identifiers */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Product Identity</CardTitle>
          </CardHeader>
          <CardContent className="tw-space-y-4">
            <div className="tw-flex tw-items-start tw-gap-4">
              <ImagePreview url={vals.image} name={vals.name} />
              <div className="tw-grid tw-flex-1 tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <ViewField label="Product Name" value={vals.name} />
                <ViewField label="SKU" value={vals.sku} />
              </div>
            </div>
            <ViewField label="Description" value={vals.description} />
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-3">
            <ViewField label="Price" value={`$${vals.price.toFixed(2)}`} />
            <ViewField label="Inventory" value={`${vals.inventory} units`} />
            <ViewField
              label="Low Stock Threshold"
              value={`${vals.lowStockThreshold} units`}
            />
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
            <ViewField label="Category" value={vals.category} />
            <ViewField
              label="Status"
              value={<ProductStatusBadge status={vals.status} />}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Create / Edit mode ----
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="tw-space-y-6" noValidate>
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Product Identity</CardTitle>
          </CardHeader>
          <CardContent className="tw-space-y-4">
            {/* Image upload */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Image</FormLabel>
                  <FormControl>
                    <ProductImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name + SKU */}
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Wireless Headphones Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="WHP-001"
                        className="tw-uppercase"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (auto-uppercased)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the product features, specifications, and use cases…"
                      className="tw-resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inventory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lowStockThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Stock Alert</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="10"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Alert when stock falls below
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="tw-text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_SELECT_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="tw-flex tw-justify-end">
          <Button type="submit" disabled={loading} className="tw-min-w-[140px]">
            {loading && <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />}
            {SUBMIT_LABELS[mode]}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ProductForm
