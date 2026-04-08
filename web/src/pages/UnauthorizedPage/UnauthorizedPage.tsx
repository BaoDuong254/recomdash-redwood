import { ShieldOff } from 'lucide-react'

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

const UnauthorizedPage = () => {
  const { logOut } = useAuth()

  const handleLogOut = async () => {
    await logOut()
    navigate(routes.login())
  }

  return (
    <>
      <Metadata title="Access Denied" robots="noindex" />

      <div className="tw-flex tw-min-h-screen tw-items-center tw-justify-center tw-bg-muted/40 tw-px-4">
        <div className="tw-w-full tw-max-w-sm">
          <Card className="tw-shadow-sm">
            <CardHeader className="tw-items-center tw-pb-4 tw-text-center">
              <div className="tw-mb-3 tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-destructive/10">
                <ShieldOff className="tw-h-6 tw-w-6 tw-text-destructive" />
              </div>
              <CardTitle className="tw-text-xl">Access Denied</CardTitle>
              <CardDescription>
                Your account does not have permission to access this area. Only
                administrators can access the dashboard.
              </CardDescription>
            </CardHeader>

            <CardContent className="tw-flex tw-flex-col tw-gap-3">
              <Button
                variant="destructive"
                className="tw-w-full"
                onClick={handleLogOut}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default UnauthorizedPage
