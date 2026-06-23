import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './utils/i18n/i18n.ts'
import 'bulma/css/bulma.min.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 min before refetch
      gcTime: 30 * 60 * 1000,           // 30 min garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Failed to find the root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)