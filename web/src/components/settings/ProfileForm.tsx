import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import AvatarUpload from 'src/components/Users/AvatarUpload'
import { ROLE_LABELS } from 'src/components/Users/types'

import { profileSchema, type ProfileFormValues } from './settingsSchemas'

export type ProfileData = {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  avatarUrl: string | null
}

type ProfileFormProps = {
  currentUser: ProfileData | null
  onSubmit: (data: ProfileFormValues) => void | Promise<void>
  loading?: boolean
}

function toFormValues(user: ProfileData | null): ProfileFormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? '',
  }
}

const ProfileForm = ({
  currentUser,
  onSubmit,
  loading = false,
}: ProfileFormProps) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(currentUser),
  })

  useEffect(() => {
    form.reset(toFormValues(currentUser))
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const roleLabel =
    ROLE_LABELS[currentUser?.role as keyof typeof ROLE_LABELS] ??
    currentUser?.role ??
    '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw-text-base">Profile Information</CardTitle>
        <CardDescription>
          Update your name, email address, and profile photo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="tw-space-y-5"
            noValidate
          >
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
                      <Input
                        placeholder="Jane Doe"
                        disabled={loading}
                        {...field}
                      />
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
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Read-only metadata */}
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
              <div className="tw-space-y-1.5">
                <p className="tw-text-sm tw-font-medium tw-text-foreground">
                  Role
                </p>
                <div className="tw-flex tw-h-9 tw-items-center">
                  <Badge variant="secondary">{roleLabel}</Badge>
                </div>
              </div>
              <div className="tw-space-y-1.5">
                <p className="tw-text-sm tw-font-medium tw-text-foreground">
                  Status
                </p>
                <div className="tw-flex tw-h-9 tw-items-center">
                  <Badge
                    variant={
                      currentUser?.status === 'ACTIVE' ? 'default' : 'outline'
                    }
                  >
                    {currentUser?.status ?? '—'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="tw-flex tw-justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="tw-min-w-[140px]"
              >
                {loading && (
                  <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ProfileForm
