import { MarketOverviewSection } from './home/MarketOverviewSection'
import { PortfolioSnapshotBar } from './home/PortfolioSnapshotBar'
import { WhatChangedSection } from './home/WhatChangedSection'

export function HomePage() {
  return (
    <div>
      <h1 className="sr-only">Home</h1>
      <PortfolioSnapshotBar />
      <WhatChangedSection />
      <MarketOverviewSection />
    </div>
  )
}
