// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { PrivateSet, Route, Router, Set } from '@redwoodjs/router'

import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

import { useAuth } from './auth'

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/unauthorized" page={UnauthorizedPage} name="unauthorized" />

      <PrivateSet unauthenticated="login">
        <PrivateSet unauthenticated="unauthorized" roles="ADMIN">
          <Set wrap={DashboardLayout}>
            <Route path="/" redirect="adminDashboard" />
            <Route path="/admin/dashboard" page={AdminDashboardPage} name="adminDashboard" />
            <Route path="/admin/products" page={AdminProductsPage} name="adminProducts" />
            <Route path="/admin/products/new" page={AdminNewProductPage} name="adminNewProduct" />
            <Route path="/admin/products/{id}" page={AdminProductPage} name="adminProduct" />
            <Route path="/admin/products/{id}/edit" page={AdminEditProductPage} name="adminEditProduct" />
          </Set>
        </PrivateSet>
      </PrivateSet>

      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
