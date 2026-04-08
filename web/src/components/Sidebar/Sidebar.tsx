import React, { useState } from 'react'

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'

import { Link, useLocation } from '@redwoodjs/router'

import { useAuth } from 'src/auth'
import { Button } from 'src/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog'
import { Separator } from 'src/components/ui/separator'
import { useSidebar } from 'src/layouts/DashboardLayout/DashboardLayout'
import { cn } from 'src/lib/utils'

type NavItem = {
  label: string
  icon: React.ElementType
  href: string
  exact?: boolean
}

const MAIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    exact: true,
  },
  { label: 'Products', icon: Package, href: '/admin/products' },
  { label: 'Orders', icon: ShoppingCart, href: '/admin/orders' },
  { label: 'Users', icon: Users, href: '/admin/users' },
]

const SECONDARY_NAV: NavItem[] = [
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { label: 'Settings', icon: Settings2, href: '/admin/settings' },
]

const Sidebar = () => {
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar()
  const { pathname } = useLocation()

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <aside
      className={cn(
        'tw-fixed tw-inset-y-0 tw-left-0 tw-z-30',
        'tw-flex tw-flex-col tw-border-r tw-border-border tw-bg-card',
        'tw-overflow-x-hidden',
        'tw-transition-all tw-duration-300 tw-ease-in-out',
        'lg:tw-relative lg:tw-translate-x-0',
        collapsed ? 'lg:tw-w-16' : 'lg:tw-w-64',
        'tw-w-64',
        mobileOpen
          ? 'tw-translate-x-0'
          : 'tw--translate-x-full lg:tw-translate-x-0'
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'tw-flex tw-h-16 tw-shrink-0 tw-items-center tw-border-b tw-border-border tw-px-4',
          collapsed ? 'lg:tw-justify-center' : 'tw-justify-between'
        )}
      >
        <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
          <img
            src="/favicon.png"
            alt="ReComDash logo"
            className="tw-h-7 tw-w-7 tw-shrink-0 tw-rounded-md"
          />
          {!collapsed && (
            <span className="tw-truncate tw-text-lg tw-font-bold tw-tracking-tight tw-text-foreground">
              ReComDash
            </span>
          )}
        </div>

        <button
          onClick={closeMobile}
          className="tw-ml-1 tw-shrink-0 tw-rounded-md tw-p-1.5 tw-text-muted-foreground hover:tw-bg-accent lg:tw-hidden"
          aria-label="Close navigation"
        >
          <X className="tw-h-4 tw-w-4" />
        </button>

        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className={cn(
              'tw-hidden tw-shrink-0 tw-rounded-md tw-p-1.5 tw-text-muted-foreground hover:tw-bg-accent',
              'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
              'lg:tw-flex'
            )}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="tw-h-4 tw-w-4" />
          </button>
        )}

        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className={cn(
              'tw-hidden tw-shrink-0 tw-rounded-md tw-p-1.5 tw-text-muted-foreground hover:tw-bg-accent',
              'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
              'lg:tw-flex'
            )}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="tw-h-4 tw-w-4" />
          </button>
        )}
      </div>

      <nav
        className="tw-flex-1 tw-overflow-y-auto tw-overflow-x-hidden tw-py-4"
        aria-label="Sidebar navigation"
      >
        {!collapsed && (
          <p className="tw-mb-1 tw-px-5 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
            Main
          </p>
        )}
        <ul className="tw-space-y-0.5 tw-px-2">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item)}
              collapsed={collapsed}
            />
          ))}
        </ul>

        <Separator className="tw-mx-2 tw-my-4" />

        {!collapsed && (
          <p className="tw-mb-1 tw-px-5 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-muted-foreground">
            Insights
          </p>
        )}
        <ul className="tw-space-y-0.5 tw-px-2">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item)}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </nav>

      <UserSection collapsed={collapsed} />
    </aside>
  )
}

type UserSectionProps = {
  collapsed: boolean
}

const UserSection = ({ collapsed }: UserSectionProps) => {
  const { currentUser, logOut } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  const userEmail =
    typeof currentUser?.email === 'string' ? currentUser.email : 'Admin'
  const userInitial = userEmail[0].toUpperCase()

  return (
    <>
      <div
        className={cn(
          'tw-border-t tw-border-border tw-px-3 tw-py-3',
          'tw-flex tw-items-center tw-gap-3',
          collapsed && 'lg:tw-flex-col lg:tw-gap-1.5 lg:tw-px-2'
        )}
      >
        <span
          className={cn(
            'tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center',
            'tw-rounded-full tw-bg-primary tw-text-sm tw-font-semibold tw-text-primary-foreground'
          )}
          aria-hidden="true"
          title={collapsed ? userEmail : undefined}
        >
          {userInitial}
        </span>

        {!collapsed && (
          <div className="tw-min-w-0 tw-flex-1">
            <p className="tw-truncate tw-text-sm tw-font-medium tw-text-foreground">
              {userEmail}
            </p>
            <p className="tw-text-xs tw-text-muted-foreground">Administrator</p>
          </div>
        )}

        <button
          onClick={() => setDialogOpen(true)}
          aria-label="Log out"
          title="Log out"
          className={cn(
            'tw-shrink-0 tw-rounded-md tw-p-1.5',
            'tw-text-muted-foreground',
            'hover:tw-bg-destructive/10 hover:tw-text-destructive',
            'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
            'tw-transition-colors'
          )}
        >
          <LogOut className="tw-h-4 tw-w-4" aria-hidden="true" />
        </button>
      </div>

      <LogoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={logOut}
      />
    </>
  )
}

type LogoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const LogoutDialog = ({ open, onOpenChange, onConfirm }: LogoutDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="tw-max-w-sm">
      <DialogHeader>
        <DialogTitle>Sign out?</DialogTitle>
        <DialogDescription>
          You&apos;ll be returned to the login page. Any unsaved changes will be
          lost.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="tw-gap-2 sm:tw-gap-0">
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          variant="destructive"
          onClick={() => {
            onOpenChange(false)
            onConfirm()
          }}
        >
          Log out
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

type NavLinkProps = {
  item: NavItem
  active: boolean
  collapsed: boolean
}

const NavLink = ({ item, active, collapsed }: NavLinkProps) => {
  const Icon = item.icon

  return (
    <li>
      <Link
        to={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'tw-flex tw-items-center tw-gap-3 tw-rounded-md tw-px-3 tw-py-2',
          'tw-text-sm tw-font-medium tw-transition-colors tw-duration-150',
          'focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring',
          active
            ? 'tw-bg-primary tw-text-primary-foreground'
            : 'tw-text-muted-foreground hover:tw-bg-accent hover:tw-text-accent-foreground',
          collapsed && 'lg:tw-justify-center lg:tw-px-2'
        )}
      >
        <Icon className="tw-h-4 tw-w-4 tw-shrink-0" aria-hidden="true" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </li>
  )
}

export default Sidebar
