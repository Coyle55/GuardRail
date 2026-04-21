import { Transfer } from '@/types'
import { useMemo } from 'react'

interface Props {
  transfers: Transfer[]
}

export function HeaderStrip({ transfers: allTransfers }: Props) {
  const completed = useMemo(
    () => allTransfers.filter((t) => t.status === 'completed'),
    [allTransfers]
  )

  const totalSaved = useMemo(
    () => completed.reduce((sum, t) => sum + t.amount, 0),
    [completed]
  )

  const thisMonth = useMemo(() => {
    const now = new Date()
    return completed
      .filter((t) => {
        const d = t.createdAt.toDate()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }, [completed])

  const stats = [
    { label: 'Saved all-time', value: `$${totalSaved.toFixed(2)}` },
    { label: 'Saved this month', value: `$${thisMonth.toFixed(2)}` },
    { label: 'Bets detected', value: allTransfers.length.toString() },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-white">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
