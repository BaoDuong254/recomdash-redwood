import React, { useEffect, useRef, useState } from 'react'

import { Bell, Menu, Search } from 'lucide-react'

import { ModeToggle } from 'src/components/ModeToggle/ModeToggle'
import { Input } from 'src/components/ui/input'
import { useSidebar } from 'src/layouts/DashboardLayout/DashboardLayout'
import { cn } from 'src/lib/utils'

const Header = () => {
  const { toggleMobile } = useSidebar()

  return (
    <header className="tw-sticky tw-top-0 tw-z-10 tw-flex tw-h-16 tw-shrink-0 tw-items-center tw-gap-3 tw-border-b tw-border-border tw-bg-card tw-px-4 tw-shadow-sm">
      <button
        onClick={toggleMobile}
        className="tw-rounded-md tw-p-2 tw-text-muted-foreground hover:tw-bg-accent hover:tw-text-accent-foreground lg:tw-hidden"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
      >
        <Menu className="tw-h-5 tw-w-5" />
      </button>

      {/* Search */}
      <div className="tw-relative tw-w-full tw-max-w-sm">
        <Search
          className="tw-pointer-events-none tw-absolute tw-left-3 tw-top-1/2 tw-h-4 tw-w-4 tw--translate-y-1/2 tw-text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search products, orders…"
          className="tw-h-9 tw-pl-9"
          aria-label="Search"
        />
      </div>

      {/* Right-side actions */}
      <div className="tw-ml-auto tw-flex tw-items-center tw-gap-2">
        <ModeToggle />
        <NotificationsButton />
      </div>
    </header>
  )
}

const NotificationsButton = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="tw-relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'tw-relative tw-rounded-md tw-p-2 tw-text-muted-foreground',
          'hover:tw-bg-accent hover:tw-text-accent-foreground',
          'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring'
        )}
        aria-label="View notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="header-notifications-panel"
      >
        <Bell className="tw-h-5 tw-w-5" />
        {/* Live activity indicator */}
        <span
          className="tw-absolute tw-right-1.5 tw-top-1.5 tw-flex tw-h-2 tw-w-2"
          aria-hidden="true"
        >
          <span className="tw-absolute tw-inline-flex tw-h-full tw-w-full tw-animate-ping tw-rounded-full tw-bg-primary tw-opacity-75" />
          <span className="tw-relative tw-inline-flex tw-h-2 tw-w-2 tw-rounded-full tw-bg-primary" />
        </span>
      </button>

      {open && (
        <div
          id="header-notifications-panel"
          className="tw-absolute tw-right-0 tw-top-full tw-mt-1 tw-w-72 tw-rounded-lg tw-border tw-border-border tw-bg-card tw-p-4 tw-shadow-lg"
          role="dialog"
          aria-modal="false"
          aria-label="Notifications"
        >
          <p className="tw-text-sm tw-font-semibold tw-text-foreground">
            Notifications
          </p>
          <p className="tw-mt-2 tw-text-xs tw-text-muted-foreground">
            No new notifications — you&apos;re all caught up.
          </p>
        </div>
      )}
    </div>
  )
}

export default Header
