'use client'

import { useTransfers } from '@/hooks/useTransfers'
import { HeaderStrip } from '@/components/dashboard/HeaderStrip'
import { SavingsChart } from '@/components/dashboard/SavingsChart'
import { SportsbookBreakdown } from '@/components/dashboard/SportsbookBreakdown'
import { TransferHistory } from '@/components/dashboard/TransferHistory'

function LoadingSkeleton() {
  return (
    <div>
      <div className="gr-skeleton" style={{ height: '26px', width: '160px', marginBottom: '32px' }} />
      <div className="gr-stats-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gr-skeleton" style={{ height: '116px', borderRadius: '16px' }} />
        ))}
      </div>
      <div className="gr-skeleton" style={{ height: '300px', borderRadius: '16px', marginBottom: '20px' }} />
      <div className="gr-bottom-grid">
        <div className="gr-skeleton" style={{ height: '280px', borderRadius: '16px' }} />
        <div className="gr-skeleton" style={{ height: '280px', borderRadius: '16px' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { transfers, loading } = useTransfers()

  if (loading) return <LoadingSkeleton />

  return (
    <div>
      <h1
        className="gr-fade-up"
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: '22px',
          letterSpacing: '-0.02em',
          color: 'var(--gr-text)',
          marginBottom: '28px',
        }}
      >
        Dashboard
      </h1>
      <HeaderStrip transfers={transfers} />
      <SavingsChart transfers={transfers} />
      <div className="gr-bottom-grid">
        <SportsbookBreakdown transfers={transfers} />
        <TransferHistory transfers={transfers} />
      </div>
    </div>
  )
}
