import { Metadata } from '@redwoodjs/web'

const DashboardPage = () => {
  return (
    <>
      <Metadata
        title="Dashboard Overview"
        description="Realtime ecommerce dashboard overview"
        robots="nofollow"
      >
        <meta httpEquiv="content-type" content="text/html; charset=UTF-8" />
      </Metadata>

      <div className="tw-space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="tw-text-2xl tw-font-bold tw-text-foreground">
            Dashboard Overview
          </h1>
          <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
            Welcome back. Here&apos;s what&apos;s happening in your store today.
          </p>
        </div>

        {/* KPI skeleton row */}
        <div
          className="tw-grid tw-gap-4 sm:tw-grid-cols-2 lg:tw-grid-cols-4"
          aria-busy="true"
          aria-label="Loading key metrics"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="tw-h-28 tw-animate-pulse tw-rounded-lg tw-bg-muted"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Chart skeleton row */}
        <div className="tw-grid tw-gap-4 lg:tw-grid-cols-3">
          <div
            className="tw-h-72 tw-animate-pulse tw-rounded-lg tw-bg-muted lg:tw-col-span-2"
            aria-hidden="true"
          />
          <div
            className="tw-h-72 tw-animate-pulse tw-rounded-lg tw-bg-muted"
            aria-hidden="true"
          />
        </div>

        {/* Table skeleton */}
        <div
          className="tw-h-48 tw-animate-pulse tw-rounded-lg tw-bg-muted"
          aria-hidden="true"
        />

        {/* Coming soon callout */}
        <div className="tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-6 tw-text-center">
          <p className="tw-text-sm tw-font-medium tw-text-foreground">
            Real-time data coming soon
          </p>
          <p className="tw-mt-1 tw-text-xs tw-text-muted-foreground">
            Charts and metrics will be populated once backend connections are
            established.
          </p>
        </div>
      </div>
    </>
  )
}

export default DashboardPage
