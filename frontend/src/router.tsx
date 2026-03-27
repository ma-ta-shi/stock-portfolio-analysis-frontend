import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { AnalysisPage } from '@/pages/AnalysisPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { FeedbackPage } from '@/pages/FeedbackPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StockPage } from '@/pages/StockPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'watchlist', element: <WatchlistPage /> },
      { path: 'stocks/:stockId', element: <StockPage /> },
      { path: 'analysis/:analysisId', element: <AnalysisPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'feedback', element: <FeedbackPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
