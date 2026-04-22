'use client'

import { Transfer } from '@/types'
import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
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
    <div
      className="gr-fade-up-3"
      style={{
        background: 'var(--gr-card)',
        border: '1px solid var(--gr-border)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 600,
            fontSize: '15px',
            letterSpacing: '-0.01em',
            color: 'var(--gr-text)',
          }}
        >
          Cumulative Savings
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['weekly', 'monthly'] as Period[]).map((p) => {
            const active = period === p
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                  borderRadius: '8px',
                  border: `1px solid ${active ? 'var(--gr-accent-border)' : 'var(--gr-border-md)'}`,
                  background: active ? 'var(--gr-accent-dim)' : 'transparent',
                  color: active ? 'var(--gr-accent)' : 'var(--gr-text-3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {data.length === 0 ? (
        <div
          style={{
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gr-text-3)',
            fontSize: '14px',
          }}
        >
          No completed transfers yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00E87A" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#00E87A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--gr-text-3)', fontSize: 11, fontFamily: 'var(--font-dm-mono, monospace)' }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: 'var(--gr-text-3)', fontSize: 11, fontFamily: 'var(--font-dm-mono, monospace)' }}
              tickFormatter={(v) => `$${v}`}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--gr-elevated)',
                border: '1px solid var(--gr-border-md)',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: '10px 14px',
              }}
              labelStyle={{ color: 'var(--gr-text-2)', fontSize: '11px', marginBottom: '4px' }}
              itemStyle={{ color: 'var(--gr-accent)', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '14px', fontWeight: 500 }}
              formatter={(value) => {
                const num = value == null ? 0 : typeof value === 'number' ? value : Number(value)
                return [`$${num.toFixed(2)}`, 'Saved'] as [string, string]
              }}
              cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#00E87A"
              strokeWidth={2}
              fill="url(#savingsGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#00E87A', stroke: 'var(--gr-bg)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
