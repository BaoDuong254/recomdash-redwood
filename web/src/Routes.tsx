// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { PrivateSet, Route, Router } from '@redwoodjs/router'

import { useAuth } from './auth'

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      {/* Public routes */}
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/unauthorized" page={UnauthorizedPage} name="unauthorized" />

      {/* Authenticated users only — unauthenticated → /login */}
      <PrivateSet unauthenticated="login">
        {/* Admin-only routes — authenticated but non-admin → /unauthorized */}
        <PrivateSet unauthenticated="unauthorized" roles="ADMIN">
          <Route path="/" redirect="adminDashboard" />
          <Route path="/admin/dashboard" page={AdminDashboardPage} name="adminDashboard" />
        </PrivateSet>
      </PrivateSet>

      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
