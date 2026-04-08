import type { ReactNode } from 'react'

import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import { ThemeProvider } from 'src/components/ThemeProvider/ThemeProvider'
import { Toaster } from 'src/components/ui/toaster'
import FatalErrorPage from 'src/pages/FatalErrorPage'

import { AuthProvider, useAuth } from './auth'

import './index.css'

interface AppProps {
  children?: ReactNode
}

const App = ({ children }: AppProps) => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <AuthProvider>
        <RedwoodApolloProvider useAuth={useAuth}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            {children}
            <Toaster />
          </ThemeProvider>
        </RedwoodApolloProvider>
      </AuthProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
