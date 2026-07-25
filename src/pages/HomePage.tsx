import { PortfolioSnapshotBar } from './home/PortfolioSnapshotBar'
import { WhatChangedSection } from './home/WhatChangedSection'
import { MarketOverviewSection } from './home/MarketOverviewSection'
import { NewsFeedSection } from './home/NewsFeedSection'

export function HomePage() {
  return (
    <div>
      <PortfolioSnapshotBar />
      <WhatChangedSection />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MarketOverviewSection />
        </div>
        <div>
          <NewsFeedSection />
        </div>
      </div>
    </div>
  )
}
