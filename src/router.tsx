import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteError } from '@/components/RouteError'
import { PageLoading } from '@/components/PageLoading'

// Each page is code-split and only downloaded when first visited.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    // Shown while the first page's code chunk loads.
    hydrateFallbackElement: <PageLoading />,
    children: [
      {
        // Pathless wrapper so page errors render inside the layout (header stays usable).
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: async () => ({ Component: (await import('@/pages/HomePage')).HomePage }) },
          { path: 'watchlist', lazy: async () => ({ Component: (await import('@/pages/WatchlistPage')).WatchlistPage }) },
          { path: 'stocks/:stockId', lazy: async () => ({ Component: (await import('@/pages/StockPage')).StockPage }) },
          { path: 'analysis/:analysisId', lazy: async () => ({ Component: (await import('@/pages/AnalysisPage')).AnalysisPage }) },
          { path: 'portfolio', lazy: async () => ({ Component: (await import('@/pages/PortfolioPage')).PortfolioPage }) },
          { path: 'feedback', lazy: async () => ({ Component: (await import('@/pages/FeedbackPage')).FeedbackPage }) },
          { path: 'settings', lazy: async () => ({ Component: (await import('@/pages/SettingsPage')).SettingsPage }) },
          { path: '*', element: <RouteError /> },
        ],
      },
    ],
  },
])
