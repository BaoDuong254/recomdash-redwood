import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'

import { useQuery } from '@redwoodjs/web'

import { Button } from 'src/components/ui/button'
import {
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

import type { OrderFormValues } from './orderSchema'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const AVAILABLE_PRODUCTS_QUERY = gql`
  query AvailableProductsForOrderQuery {
    products(pageSize: 100) {
      products {
        id
        name
        price
      }
    }
  }
`

type AvailableProduct = { id: string; name: string; price: number }

// ---------------------------------------------------------------------------
// Line item subtotal display
// ---------------------------------------------------------------------------

const ItemSubtotal = ({ index }: { index: number }) => {
  const price = useWatch<OrderFormValues>({ name: `items.${index}.price` })
  const quantity = useWatch<OrderFormValues>({
    name: `items.${index}.quantity`,
  })
  const subtotal = (Number(price) || 0) * (Number(quantity) || 0)
  return (
    <div className="tw-flex tw-flex-col tw-items-end tw-justify-center tw-pt-5">
      <span className="tw-text-sm tw-font-semibold tw-text-foreground">
        ${subtotal.toFixed(2)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderItemsField
// ---------------------------------------------------------------------------

const OrderItemsField = () => {
  const { control, setValue } = useFormContext<OrderFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const { data } = useQuery(AVAILABLE_PRODUCTS_QUERY)
  const availableProducts: AvailableProduct[] = data?.products?.products ?? []

  const handleProductChange = (index: number, productId: string) => {
    const product = availableProducts.find((p) => p.id === productId)
    if (product) {
      setValue(`items.${index}.productId`, product.id)
      setValue(`items.${index}.name`, product.name)
      setValue(`items.${index}.price`, product.price)
    }
  }

  return (
    <div className="tw-space-y-3">
      {/* Header row — visible only when there are items */}
      {fields.length > 0 && (
        <div className="tw-grid tw-grid-cols-[1fr_90px_90px_80px_32px] tw-gap-2">
          <span className="tw-text-xs tw-font-medium tw-text-muted-foreground">
            Product
          </span>
          <span className="tw-text-xs tw-font-medium tw-text-muted-foreground">
            Price ($)
          </span>
          <span className="tw-text-xs tw-font-medium tw-text-muted-foreground">
            Qty
          </span>
          <span className="tw-text-right tw-text-xs tw-font-medium tw-text-muted-foreground">
            Subtotal
          </span>
          <span />
        </div>
      )}

      {/* Item rows */}
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="tw-grid tw-grid-cols-[1fr_90px_90px_80px_32px] tw-items-start tw-gap-2"
        >
          {/* Product select */}
          <FormField
            control={control}
            name={`items.${index}.productId`}
            render={({ field: f }) => (
              <FormItem className="tw-space-y-0">
                <FormLabel className="tw-sr-only">Product</FormLabel>
                <Select
                  value={f.value}
                  onValueChange={(v) => handleProductChange(index, v)}
                >
                  <FormControl>
                    <SelectTrigger className="tw-h-9">
                      <SelectValue placeholder="Select product…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price */}
          <FormField
            control={control}
            name={`items.${index}.price`}
            render={({ field: f }) => (
              <FormItem className="tw-space-y-0">
                <FormLabel className="tw-sr-only">Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="tw-h-9"
                    {...f}
                    onChange={(e) =>
                      f.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity */}
          <FormField
            control={control}
            name={`items.${index}.quantity`}
            render={({ field: f }) => (
              <FormItem className="tw-space-y-0">
                <FormLabel className="tw-sr-only">Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="tw-h-9"
                    {...f}
                    onChange={(e) =>
                      f.onChange(parseInt(e.target.value, 10) || 1)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Subtotal */}
          <ItemSubtotal index={index} />

          {/* Remove */}
          <div className="tw-pt-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="tw-h-9 tw-w-8 tw-text-muted-foreground hover:tw-text-destructive"
              onClick={() => remove(index)}
              aria-label={`Remove item ${index + 1}`}
            >
              <Trash2 className="tw-h-3.5 tw-w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {fields.length === 0 && (
        <div className="tw-rounded-md tw-border tw-border-dashed tw-border-border tw-py-8 tw-text-center">
          <p className="tw-text-sm tw-text-muted-foreground">
            No items added yet. Click &quot;Add Item&quot; to get started.
          </p>
        </div>
      )}

      {/* Add item button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({ productId: '', name: '', price: 0, quantity: 1 })
        }
        className="tw-mt-1"
      >
        <Plus className="tw-h-4 tw-w-4" />
        Add Item
      </Button>
    </div>
  )
}

export default OrderItemsField
