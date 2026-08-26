import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/app/queryClient'
import { AuthProvider } from '@/app/AuthContext'
import { ToastProvider } from '@/app/ToastContext'
import { ToastViewport } from '@/components/feedback/Toast'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { AppRoutes } from '@/routes/routeConfig'

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
