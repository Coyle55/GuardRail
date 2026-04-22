'use client'

import { Transfer } from '@/types'
import { useMemo, useEffect, useState } from 'react'

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = Date.now()
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

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

  const animTotal = useCountUp(totalSaved, 1600)
  const animMonth = useCountUp(thisMonth, 1200)

  return (
    <div className="gr-stats-grid">
      {/* Hero — all-time */}
      <div
        className="gr-fade-up"
        style={{
          background: 'var(--gr-card)',
          border: '1px solid var(--gr-accent-border)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '130px',
            height: '130px',
            background: 'radial-gradient(circle, rgba(0,232,122,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--gr-accent)',
            marginBottom: '10px',
          }}
        >
          All-time saved
        </p>
        <p
          className="gr-accent-num"
          style={{ fontSize: '34px', fontWeight: 500, lineHeight: 1 }}
        >
          ${animTotal.toFixed(2)}
        </p>
      </div>

      {/* This month */}
      <div
        className="gr-fade-up-1"
        style={{
          background: 'var(--gr-card)',
          border: '1px solid var(--gr-border)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--gr-text-3)',
            marginBottom: '10px',
          }}
        >
          This month
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '34px',
            fontWeight: 500,
            lineHeight: 1,
            color: 'var(--gr-text)',
          }}
        >
          ${animMonth.toFixed(2)}
        </p>
      </div>

      {/* Bets detected */}
      <div
        className="gr-fade-up-2"
        style={{
          background: 'var(--gr-card)',
          border: '1px solid var(--gr-border)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--gr-text-3)',
            marginBottom: '10px',
          }}
        >
          Bets detected
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '34px',
            fontWeight: 500,
            lineHeight: 1,
            color: 'var(--gr-text)',
          }}
        >
          {allTransfers.length}
        </p>
      </div>
    </div>
  )
}
