'use client'

import { useTransfers } from '@/hooks/useTransfers'
import { HeaderStrip } from '@/components/dashboard/HeaderStrip'
import { SavingsChart } from '@/components/dashboard/SavingsChart'
import { SportsbookBreakdown } from '@/components/dashboard/SportsbookBreakdown'
import { TransferHistory } from '@/components/dashboard/TransferHistory'

export default function DashboardPage() {
  const { transfers, loading } = useTransfers()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <HeaderStrip transfers={transfers} />
      <SavingsChart transfers={transfers} />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <SportsbookBreakdown transfers={transfers} />
        </div>
        <div className="col-span-2">
          <TransferHistory transfers={transfers} />
        </div>
      </div>
    </div>
  )
}
