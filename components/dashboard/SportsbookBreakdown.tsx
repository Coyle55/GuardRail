import { Transfer } from '@/types'
import { useMemo } from 'react'

interface Props {
  transfers: Transfer[]
}

export function SportsbookBreakdown({ transfers }: Props) {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>()
    transfers
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount)
      })
    return Array.from(map.entries())
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
  }, [transfers])

  if (breakdown.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">By Sportsbook</h2>
        <p className="text-gray-500 text-sm">No transfers yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">By Sportsbook</h2>
      <ul className="space-y-3">
        {breakdown.map(({ merchant, total }) => (
          <li key={merchant} className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">{merchant}</span>
            <span className="text-white font-semibold">${total.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
