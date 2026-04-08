import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

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
import { cn } from 'src/lib/utils'

import { passwordSchema, type PasswordFormValues } from './settingsSchemas'

type PasswordFormProps = {
  onSubmit: (data: PasswordFormValues) => void | Promise<void>
  loading?: boolean
}

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: 'tw-bg-destructive' }
  if (score === 2) return { score: 2, label: 'Fair', color: 'tw-bg-orange-400' }
  if (score === 3) return { score: 3, label: 'Good', color: 'tw-bg-yellow-400' }
  if (score === 4)
    return { score: 4, label: 'Strong', color: 'tw-bg-green-500' }
  return { score: 5, label: 'Very strong', color: 'tw-bg-green-600' }
}

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  show: boolean
  onToggle: () => void
}

const PasswordInput = ({ show, onToggle, ...props }: PasswordInputProps) => (
  <div className="tw-relative">
    <Input type={show ? 'text' : 'password'} className="tw-pr-10" {...props} />
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2',
        'tw-text-muted-foreground tw-transition-colors hover:tw-text-foreground',
        'tw-rounded-sm focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring'
      )}
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <EyeOff className="tw-h-4 tw-w-4" />
      ) : (
        <Eye className="tw-h-4 tw-w-4" />
      )}
    </button>
  </div>
)

const PasswordForm = ({ onSubmit, loading = false }: PasswordFormProps) => {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPasswordValue = form.watch('newPassword')
  const strength = getPasswordStrength(newPasswordValue)

  const handleSubmit = async (data: PasswordFormValues) => {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw-text-base">Change Password</CardTitle>
        <CardDescription>
          Choose a strong password. You&apos;ll need your current password to
          make this change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="tw-space-y-4"
            noValidate
          >
            {/* Current password */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      show={showCurrent}
                      onToggle={() => setShowCurrent((p) => !p)}
                      placeholder="Enter your current password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New password */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      show={showNew}
                      onToggle={() => setShowNew((p) => !p)}
                      placeholder="At least 8 characters"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>

                  {/* Strength indicator */}
                  {newPasswordValue && (
                    <div className="tw-space-y-1 tw-pt-1">
                      <div className="tw-flex tw-gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              'tw-h-1 tw-flex-1 tw-rounded-full tw-transition-colors tw-duration-300',
                              level <= strength.score
                                ? strength.color
                                : 'tw-bg-muted'
                            )}
                          />
                        ))}
                      </div>
                      <p className="tw-text-xs tw-text-muted-foreground">
                        Strength:{' '}
                        <span className="tw-font-medium tw-text-foreground">
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      show={showConfirm}
                      onToggle={() => setShowConfirm((p) => !p)}
                      placeholder="Re-enter new password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="tw-flex tw-justify-end tw-pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="tw-min-w-[160px]"
              >
                {loading && (
                  <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
                )}
                Update Password
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default PasswordForm
