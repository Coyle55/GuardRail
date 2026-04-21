'use client'

import { Transfer } from '@/types'
import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  transfers: Transfer[]
}

type Period = 'weekly' | 'monthly'

function formatKey(date: Date, period: Period): string {
  if (period === 'monthly') {
    return date.toLocaleString('default', { month: 'short', year: '2-digit' })
  }
  // ISO week: YYYY-Www
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `W${week} '${String(d.getUTCFullYear()).slice(2)}`
}

export function SavingsChart({ transfers }: Props) {
  const [period, setPeriod] = useState<Period>('weekly')

  const data = useMemo(() => {
    const map = new Map<string, number>()
    transfers
      .filter((t) => t.status === 'completed')
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
      .forEach((t) => {
        const key = formatKey(t.createdAt.toDate(), period)
        map.set(key, (map.get(key) ?? 0) + t.amount)
      })

    let cumulative = 0
    return Array.from(map.entries()).map(([label, amount]) => {
      cumulative += amount
      return { label, amount: parseFloat(cumulative.toFixed(2)) }
    })
  }, [transfers, period])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Savings Over Time</h2>
        <div className="flex gap-2">
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white bg-gray-800'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb' }}
              formatter={(value) => {
                const num = typeof value === 'number' ? value : Number(value)
                return [`$${num.toFixed(2)}`, 'Saved'] as [string, string]
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
