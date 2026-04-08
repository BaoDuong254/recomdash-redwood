import * as React from 'react'

import { Metadata } from '@redwoodjs/web'

import DashboardContent from 'src/components/Dashboard/DashboardContent'
import DashboardHeader, {
  type TimeRange,
} from 'src/components/Dashboard/DashboardHeader'

const DashboardPage = () => {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('30d')

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
        <DashboardHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <DashboardContent timeRange={timeRange} />
      </div>
    </>
  )
}

export default DashboardPage
