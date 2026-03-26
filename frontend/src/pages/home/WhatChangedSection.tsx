import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Target,
  BarChart2,
  Calendar,
  Bot,
} from 'lucide-react'
import { useAlerts } from '@/hooks/use-alerts'
import { formatRelativeTime } from '@/lib/utils'
import type { AlertType } from '@/types'

const iconMap: Record<AlertType, React.ElementType> = {
  recommendation_change: TrendingUp,
  prediction_result: Target,
  price_movement: BarChart2,
  earnings_upcoming: Calendar,
  agent_decision: Bot,
}

const VALID_STATIC_ACTION_ROUTES = new Set(['/watchlist', '/portfolio', '/feedback', '/settings', '/'])

function isSafeInternalActionUrl(url: string): boolean {
  if (!url.startsWith('/')) return false
  return VALID_STATIC_ACTION_ROUTES.has(url) || url.startsWith('/analysis/')
}

export function WhatChangedSection() {
  const { data: alerts, isLoading } = useAlerts()

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">What Changed</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const displayed = alerts?.slice(0, 8) ?? []

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">What Changed</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {displayed.map((alert) => {
          const Icon = iconMap[alert.type] ?? Bot
          const safeActionUrl =
            alert.action_url && isSafeInternalActionUrl(alert.action_url) ? alert.action_url : null

          return (
            <div
              key={alert.alert_id}
              className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1"
            >
              <div className="flex items-start gap-2">
                <div className="relative shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {!alert.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug line-clamp-1">
                    {alert.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {alert.message}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(alert.created_at)}
                </span>
                {safeActionUrl && (
                  <Link
                    to={safeActionUrl}
                    className="text-xs text-primary hover:underline"
                  >
                    {alert.action_label ?? 'View'}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
