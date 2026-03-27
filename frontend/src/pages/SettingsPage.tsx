import { useUserProfile } from '@/hooks/use-user-profile'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCAD } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { GoalPriority, InvestmentGoalType, RrspContributionStrategy } from '@/types'

function InfoRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <div>
        <span className="text-sm text-muted-foreground">{label}</span>
        {note && <div className="text-xs text-muted-foreground/60 mt-0.5">{note}</div>}
      </div>
      <span className="text-sm font-medium text-right max-w-xs">{value}</span>
    </div>
  )
}

function NotificationRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'inline-block w-2.5 h-2.5 rounded-full',
          enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30',
        )}
      />
    </div>
  )
}

const RISK_DESCRIPTIONS: Record<string, string> = {
  conservative: 'Capital preservation — prioritise stability and income over growth.',
  moderate: 'Balanced — willing to accept volatility in exchange for higher long-term returns.',
  aggressive: 'Growth-focused — comfortable with significant swings for maximum long-term gain.',
}

const GOAL_TYPE_LABELS: Record<InvestmentGoalType, string> = {
  early_retirement: 'Early Retirement',
  passive_income: 'Passive Income',
  down_payment: 'Down Payment',
  education: 'Education',
  wealth_building: 'Wealth Building',
  emergency_fund: 'Emergency Fund',
  other: 'Other',
}

const PRIORITY_COLORS: Record<GoalPriority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
}

const RRSP_STRATEGY_LABELS: Record<RrspContributionStrategy, string> = {
  maximize_each_year: 'Maximize each year',
  maximize_when_possible: 'Maximize when possible',
  targeted_deduction: 'Targeted deduction (match tax bracket)',
  system_advised: 'Let the system advise',
}

const RRSP_STRATEGY_DESCRIPTIONS: Record<RrspContributionStrategy, string> = {
  maximize_each_year: 'Always contribute the maximum RRSP room annually.',
  maximize_when_possible: 'Contribute as much as cash flow allows, without forcing it.',
  targeted_deduction: 'Contribute only enough to bring income into a lower tax bracket.',
  system_advised: 'The portfolio optimizer determines optimal RRSP vs TFSA allocation.',
}

function ProfileTab() {
  const { data, isLoading } = useUserProfile()

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (!data) return null

  const f = data.financial_profile
  const riskColor =
    f.risk_tolerance === 'aggressive'
      ? 'bg-red-100 text-red-700 border-red-200'
      : f.risk_tolerance === 'moderate'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-blue-100 text-blue-700 border-blue-200'

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-lg font-semibold">{data.display_name}</h2>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{data.user_id}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Member since{' '}
          {new Date(data.created_at).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Tax &amp; Income</h3>
        <InfoRow label="Province / Territory" value={f.province} />
        <InfoRow
          label="Income Bracket"
          value={f.income_bracket}
          note="7-bracket scale in $50K increments"
        />
        <InfoRow
          label="Marginal Tax Rate"
          value={
            <div className="flex items-center gap-2">
              <span>{(f.marginal_tax_rate * 100).toFixed(2)}%</span>
              <span className="text-xs text-muted-foreground">
                {f.marginal_tax_rate_is_manual ? '(manual override)' : '(auto-calculated)'}
              </span>
            </div>
          }
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Investment Profile</h3>
        <InfoRow label="Experience Level" value={f.investment_experience} />
        <InfoRow
          label="Risk Tolerance"
          value={
            <div className="text-right">
              <Badge variant="outline" className={cn('text-xs', riskColor)}>
                {f.risk_tolerance}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1 max-w-52">
                {RISK_DESCRIPTIONS[f.risk_tolerance]}
              </p>
            </div>
          }
        />
        <InfoRow label="Default Account" value={f.default_account_type.toUpperCase()} />
        <InfoRow label="Default Timeline" value={f.default_timeline.replace(/_/g, ' ')} />
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Contribution Room</h3>
        <InfoRow
          label="TFSA Room"
          value={formatCAD(f.tfsa_contribution_room)}
          note="Auto-updated when transactions are recorded. Jan 1: new limit + prior withdrawals added."
        />
        <InfoRow
          label="RRSP Room"
          value={formatCAD(f.rrsp_contribution_room)}
          note="Update each February from your CRA Notice of Assessment."
        />
      </div>

      {data.context_and_goals.notes_to_agents && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Notes to Agents</h3>
          <blockquote className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">
            {data.context_and_goals.notes_to_agents}
          </blockquote>
        </div>
      )}
    </div>
  )
}

function GoalsTab() {
  const { data, isLoading } = useUserProfile()

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (!data) return null

  const g = data.context_and_goals
  const goals = g.goals ?? []

  // Fall back to legacy single-goal display if no goals array
  const legacyGoal = !goals.length && g.primary_goal
    ? [{
        name: g.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: g.primary_goal as InvestmentGoalType,
        target_amount: g.target_portfolio_value,
        target_date: undefined,
        target_passive_income: g.target_annual_passive_income,
        priority: 'high' as GoalPriority,
      }]
    : goals

  const constraints = g.time_sensitive_constraints

  return (
    <div className="space-y-4">
      {legacyGoal.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No goals configured yet.
        </div>
      ) : (
        legacyGoal.map((goal, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">{goal.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {GOAL_TYPE_LABELS[goal.type] ?? goal.type}
                </div>
              </div>
              <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[goal.priority])}>
                {goal.priority} priority
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {goal.target_amount != null && (
                <div>
                  <div className="text-xs text-muted-foreground">Target Amount</div>
                  <div className="text-sm font-medium">{formatCAD(goal.target_amount)}</div>
                </div>
              )}
              {goal.target_date && (
                <div>
                  <div className="text-xs text-muted-foreground">Target Date</div>
                  <div className="text-sm font-medium">
                    {new Date(goal.target_date).toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
              )}
              {goal.target_passive_income != null && (
                <div>
                  <div className="text-xs text-muted-foreground">Target Passive Income</div>
                  <div className="text-sm font-medium">
                    {formatCAD(goal.target_passive_income)}/yr
                  </div>
                </div>
              )}
            </div>
            {goal.notes && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-1">
                {goal.notes}
              </p>
            )}
          </div>
        ))
      )}

      {constraints.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Time-Sensitive Constraints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1 pr-4">Description</th>
                  <th className="text-right py-1 pr-4">Amount</th>
                  <th className="text-left py-1 pr-4">Deadline</th>
                  <th className="text-left py-1">Priority</th>
                </tr>
              </thead>
              <tbody>
                {constraints.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">{c.description}</td>
                    <td className="py-2 pr-4 text-right">{formatCAD(c.amount_needed)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{c.deadline}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {c.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function InvestmentPreferencesTab() {
  const { data, isLoading } = useUserProfile()

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (!data) return null

  const prefs = data.context_and_goals.investment_preferences
  const divPref = typeof prefs.dividend_preference === 'boolean'
    ? (prefs.dividend_preference ? 'high' : 'none')
    : prefs.dividend_preference
  const geoPref = typeof prefs.geographic_preference === 'string'
    ? prefs.geographic_preference.replace(/_/g, ' ')
    : prefs.geographic_preference
  const rrspStrategy = prefs.rrsp_contribution_strategy

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Sectors</h3>
        <InfoRow
          label="Sectors of Interest"
          value={
            prefs.sectors_of_interest.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-end">
                {prefs.sectors_of_interest.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">None specified</span>
            )
          }
        />
        <InfoRow
          label="Sectors to Avoid"
          value={
            prefs.sectors_to_avoid.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-end">
                {prefs.sectors_to_avoid.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs text-red-600">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">None</span>
            )
          }
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Position Sizing &amp; Preferences</h3>
        <InfoRow
          label="Max Single Position"
          value={`${(prefs.max_single_position_pct * 100).toFixed(0)}%`}
          note="Applies as a hard cap per holding across all accounts"
        />
        <InfoRow
          label="Dividend Preference"
          value={
            <div className="text-right">
              <span className="capitalize">{divPref}</span>
              <div className="text-xs text-muted-foreground mt-0.5">
                {{
                  high: 'Strong preference for dividend-paying stocks.',
                  moderate: 'Dividends are welcome but not required.',
                  minimal: 'Focus on growth; dividends are incidental.',
                  none: 'Pure growth focus — no dividend filter applied.',
                }[divPref] ?? ''}
              </div>
            </div>
          }
        />
        <InfoRow
          label="Geographic Preference"
          value={<span className="capitalize">{geoPref}</span>}
        />
      </div>

      {rrspStrategy && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">RRSP Contribution Strategy</h3>
          <div className="space-y-1">
            <div className="text-sm font-medium">{RRSP_STRATEGY_LABELS[rrspStrategy]}</div>
            <div className="text-xs text-muted-foreground">
              {RRSP_STRATEGY_DESCRIPTIONS[rrspStrategy]}
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
              Note: Maximizing RRSP is not always optimal — the benefit depends on your marginal
              rate at contribution vs your expected effective rate at withdrawal. The system respects
              this strategy preference when making portfolio optimization recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationsTab() {
  const { data, isLoading } = useUserProfile()

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (!data) return null

  const n = data.app_settings.notifications
  const s = data.app_settings

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Notifications</h3>
        <NotificationRow label="Outlook Changes" enabled={n.recommendation_changes} />
        <NotificationRow label="Price Alerts" enabled={n.price_alerts} />
        <NotificationRow label="Prediction Checkpoints" enabled={n.prediction_checkpoints} />
        <NotificationRow label="Market News" enabled={n.market_news} />
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">System</h3>
        <InfoRow label="LLM Mode" value={s.llm_mode.replace(/_/g, ' ')} />
        <InfoRow label="Batch Analysis Schedule" value={s.batch_analysis_schedule.replace(/_/g, ' ')} />
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
        <TabsContent value="preferences">
          <InvestmentPreferencesTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
