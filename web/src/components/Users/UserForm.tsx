import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { navigate, routes } from '@redwoodjs/router'

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
import AvatarUpload from 'src/components/Users/AvatarUpload'

import { ROLE_OPTIONS, STATUS_OPTIONS, type User } from './types'
import { userSchema, type UserFormValues } from './userSchema'

export type UserFormMode = 'create' | 'edit'

export type UserFormProps = {
  mode: UserFormMode
  defaultValues?: User | null
  onSubmit: (data: UserFormValues) => void | Promise<void>
  loading?: boolean
  title: string
  subtitle?: string
}

function toFormValues(user?: User | null): UserFormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role as UserFormValues['role']) ?? 'USER',
    status: (user?.status as UserFormValues['status']) ?? 'ACTIVE',
    avatarUrl: user?.avatarUrl ?? '',
    password: '',
  }
}

const UserForm = ({
  mode,
  defaultValues,
  onSubmit,
  loading = false,
  title,
  subtitle,
}: UserFormProps) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: toFormValues(defaultValues),
  })

  // Sync when data loads (e.g. after Cell fetch resolves)
  useEffect(() => {
    form.reset(toFormValues(defaultValues))
  }, [defaultValues?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.filter((o) => o.value !== 'all')
  const STATUS_SELECT_OPTIONS = STATUS_OPTIONS.filter((o) => o.value !== 'all')

  return (
    <div className="tw-mx-auto tw-max-w-2xl tw-space-y-6">
      {/* Page header */}
      <div className="tw-flex tw-items-center tw-gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(routes.adminUsers())}
          aria-label="Back to users"
        >
          <ArrowLeft className="tw-h-4 tw-w-4" />
        </Button>
        <div>
          <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="tw-mt-0.5 tw-text-sm tw-text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="tw-space-y-6"
          noValidate
        >
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="tw-text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="tw-space-y-4">
              {/* Avatar */}
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar</FormLabel>
                    <FormControl>
                      <AvatarUpload
                        value={field.value}
                        onChange={field.onChange}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name + Email */}
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
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

              {/* Password (create only) */}
              {mode === 'create' && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Leave blank to auto-generate"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        If left blank, a temporary password will be generated.
                        The user can reset it via &quot;Forgot password&quot;.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Permissions & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="tw-text-base">
                Permissions & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_SELECT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
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
                        {STATUS_SELECT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="tw-flex tw-justify-end tw-gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(routes.adminUsers())}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="tw-min-w-[140px]"
            >
              {loading && <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />}
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default UserForm
