import { Metadata } from '@redwoodjs/web'

import { useAuth } from 'src/auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card'

const DashboardPage = () => {
  const { currentUser, logOut } = useAuth()
  const currentUserEmail =
    typeof currentUser?.email === 'string' ? currentUser.email : 'Unknown User'

  return (
    <>
      <Metadata
        title="Admin Dashboard"
        description="Admin dashboard for monitoring key metrics and managing the application."
        robots="nofollow"
      >
        <meta httpEquiv="content-type" content="text/html; charset=UTF-8" />
      </Metadata>
      <div className="tw-min-h-screen tw-bg-background tw-p-8">
        <div className="tw-mx-auto tw-max-w-7xl">
          <div className="tw-mb-8 tw-flex tw-items-center tw-justify-between">
            <h1 className="tw-text-3xl tw-font-bold">Admin Dashboard</h1>
            <button
              onClick={logOut}
              className="tw-text-sm tw-text-muted-foreground tw-underline-offset-4 hover:tw-underline"
            >
              Log out
            </button>
          </div>
          <div className="tw-grid tw-gap-4 md:tw-grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="tw-text-4xl tw-font-bold">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="tw-text-4xl tw-font-bold">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="tw-text-4xl tw-font-bold">—</p>
              </CardContent>
            </Card>
          </div>
          <p className="tw-mt-8 tw-text-sm tw-text-muted-foreground">
            Logged in as {currentUserEmail}
          </p>
        </div>
      </div>
    </>
  )
}

export default DashboardPage
