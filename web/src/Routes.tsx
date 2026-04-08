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
      {/* Root path always resolves to the admin entry route */}
      <Route path="/" redirect="adminDashboard" />

      {/* Public routes */}
      <Route path="/login" page={LoginPage} name="login" />

      {/* Admin-only routes — redirect to /login if not authenticated */}
      <PrivateSet unauthenticated="login">
        <Route path="/admin/dashboard" page={AdminDashboardPage} name="adminDashboard" />
      </PrivateSet>

      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
