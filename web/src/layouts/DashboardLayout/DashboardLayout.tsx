import React, { createContext, useContext, useState } from 'react'

import AdminChatbot from 'src/components/AdminChatbot/AdminChatbot'
import Header from 'src/components/Header/Header'
import Sidebar from 'src/components/Sidebar/Sidebar'

interface SidebarContextValue {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside DashboardLayout')
  return ctx
}

type DashboardLayoutProps = {
  children?: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () => setCollapsed((prev) => !prev)
  const toggleMobile = () => setMobileOpen((prev) => !prev)
  const closeMobile = () => setMobileOpen(false)

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        toggleCollapsed,
        toggleMobile,
        closeMobile,
      }}
    >
      <div className="tw-flex tw-h-screen tw-overflow-hidden tw-bg-background">
        {/* Mobile overlay — click outside sidebar to close */}
        {mobileOpen && (
          <div
            className="tw-fixed tw-inset-0 tw-z-20 tw-bg-black/50 lg:tw-hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <Sidebar />

        {/* Right column: sticky header + scrollable content */}
        <div className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col">
          <Header />
          <main
            id="main-content"
            className="tw-flex-1 tw-overflow-auto tw-bg-muted/30 tw-p-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>

      <AdminChatbot />
    </SidebarContext.Provider>
  )
}

export default DashboardLayout
