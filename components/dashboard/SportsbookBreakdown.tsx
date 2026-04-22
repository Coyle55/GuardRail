'use client'

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

  const maxTotal = breakdown[0]?.total ?? 1

  return (
    <div
      className="gr-fade-up-4"
      style={{
        background: 'var(--gr-card)',
        border: '1px solid var(--gr-border)',
        borderRadius: '16px',
        padding: '24px',
        height: '100%',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 600,
          fontSize: '15px',
          letterSpacing: '-0.01em',
          color: 'var(--gr-text)',
          marginBottom: '20px',
        }}
      >
        By Sportsbook
      </h2>

      {breakdown.length === 0 ? (
        <p style={{ color: 'var(--gr-text-3)', fontSize: '14px' }}>No transfers yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {breakdown.map(({ merchant, total }, i) => {
            const pct = (total / maxTotal) * 100
            return (
              <li key={merchant} style={{ animationDelay: `${0.32 + i * 0.06}s` }} className="gr-fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--gr-text-2)', fontWeight: 400 }}>
                    {merchant}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--gr-text)',
                    }}
                  >
                    ${total.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    height: '3px',
                    background: 'var(--gr-border)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: i === 0 ? 'var(--gr-accent)' : 'rgba(0,232,122,0.4)',
                      borderRadius: '2px',
                      animation: 'barFill 0.8s ease both',
                      animationDelay: `${0.36 + i * 0.07}s`,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
