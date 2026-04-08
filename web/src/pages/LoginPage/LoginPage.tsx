import { useEffect, useRef, useState } from 'react'

import { Eye, EyeOff } from 'lucide-react'

import { navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import { Button } from 'src/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'
import { Checkbox } from 'src/components/ui/checkbox'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { Separator } from 'src/components/ui/separator'

const GitHubIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="tw-h-4 tw-w-4"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="tw-h-4 tw-w-4" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

const LoginPage = () => {
  const { logIn, isAuthenticated, currentUser } = useAuth()
  const emailRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return
    if ((currentUser as { roles?: string }).roles === 'ADMIN') {
      navigate(routes.adminDashboard())
    } else {
      navigate(routes.unauthorized())
    }
  }, [isAuthenticated, currentUser])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)
    const response = await logIn({ username: email, password })
    setLoading(false)

    if (response.message) {
      setError(response.message)
    } else if (response.error) {
      setError(response.error)
    }
  }

  return (
    <>
      <Metadata
        title="Admin Login"
        description="Login page for administrators to access the dashboard and manage the application."
        robots="nofollow"
      >
        <meta httpEquiv="content-type" content="text/html; charset=UTF-8" />
      </Metadata>

      <div className="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-muted/40 tw-px-4">
        <div className="tw-w-full tw-max-w-sm tw-space-y-6">
          <Card className="tw-shadow-sm">
            <CardHeader className="tw-pb-4">
              <CardTitle className="tw-text-center tw-text-xl">
                <img
                  src="/favicon.png"
                  alt="App Logo"
                  className="tw-mx-auto tw-mb-4 tw-h-10 tw-w-auto"
                />
                Welcome back
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="tw-space-y-4">
              {/* Credentials form */}
              <form onSubmit={onSubmit} noValidate className="tw-space-y-4">
                <div className="tw-space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
                    ref={emailRef}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <div className="tw-space-y-2">
                  <div className="tw-flex tw-items-center tw-justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="tw-text-xs tw-text-muted-foreground tw-underline-offset-4 hover:tw-underline"
                      tabIndex={-1}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="tw-relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                      className="tw-pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="tw-absolute tw-inset-y-0 tw-right-0 tw-flex tw-items-center tw-px-3 tw-text-muted-foreground hover:tw-text-foreground focus:tw-outline-none"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="tw-h-4 tw-w-4" />
                      ) : (
                        <Eye className="tw-h-4 tw-w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="tw-flex tw-items-center tw-gap-2">
                  <Checkbox id="remember" />
                  <Label
                    htmlFor="remember"
                    className="tw-cursor-pointer tw-text-sm tw-font-normal tw-text-muted-foreground"
                  >
                    Remember me
                  </Label>
                </div>

                {error && (
                  <p role="alert" className="tw-text-sm tw-text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="tw-w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="tw-relative tw-flex tw-items-center">
                <Separator className="tw-flex-1" />
                <span className="tw-mx-3 tw-whitespace-nowrap tw-text-xs tw-text-muted-foreground">
                  or continue with
                </span>
                <Separator className="tw-flex-1" />
              </div>

              {/* OAuth buttons */}
              <div className="tw-grid tw-grid-cols-2 tw-gap-3">
                <Button variant="outline" type="button" disabled>
                  <GoogleIcon />
                  <span className="tw-ml-2">Google</span>
                </Button>
                <Button variant="outline" type="button" disabled>
                  <GitHubIcon />
                  <span className="tw-ml-2">GitHub</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default LoginPage
