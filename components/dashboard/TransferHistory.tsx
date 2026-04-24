'use client'

import { Transfer } from '@/types'
import { useState } from 'react'

interface Props {
  transfers: Transfer[]
}

const PAGE_SIZE = 10

const statusConfig: Record<Transfer['status'], { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: 'Completed', color: '#00E87A',             bg: 'var(--gr-green-dim)',  dot: '#00E87A' },
  pending:   { label: 'Pending',   color: 'var(--gr-yellow)',    bg: 'var(--gr-yellow-dim)', dot: 'var(--gr-yellow)' },
  failed:    { label: 'Failed',    color: 'var(--gr-red)',       bg: 'var(--gr-red-dim)',    dot: 'var(--gr-red)' },
}

function StatusBadge({ status }: { status: Transfer['status'] }) {
  const s = statusConfig[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '20px',
      background: s.bg, fontSize: '10px', fontWeight: 600, color: s.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function Pagination({
  page, totalPages, onPrev, onNext,
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gr-border)', flexShrink: 0,
    }}>
      <button onClick={onPrev} disabled={page === 0} style={{
        background: 'none', border: '1px solid var(--gr-border-md)', borderRadius: '8px',
        color: page === 0 ? 'var(--gr-text-3)' : 'var(--gr-text-2)',
        fontSize: '12px', padding: '5px 12px', cursor: page === 0 ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: page === 0 ? 0.4 : 1, transition: 'color 0.15s',
        minHeight: '36px', minWidth: '64px',
      }}>
        ← Prev
      </button>
      <span style={{ fontSize: '12px', color: 'var(--gr-text-3)', fontFamily: 'var(--font-dm-mono, monospace)' }}>
        {page + 1} / {totalPages}
      </span>
      <button onClick={onNext} disabled={page === totalPages - 1} style={{
        background: 'none', border: '1px solid var(--gr-border-md)', borderRadius: '8px',
        color: page === totalPages - 1 ? 'var(--gr-text-3)' : 'var(--gr-text-2)',
        fontSize: '12px', padding: '5px 12px', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', opacity: page === totalPages - 1 ? 0.4 : 1, transition: 'color 0.15s',
        minHeight: '36px', minWidth: '64px',
      }}>
        Next →
      </button>
    </div>
  )
}

export function TransferHistory({ transfers }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(transfers.length / PAGE_SIZE)
  const visible = transfers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="gr-fade-up-5" style={{
      background: 'var(--gr-card)', border: '1px solid var(--gr-border)',
      borderRadius: '16px', padding: '24px', height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: '15px',
        letterSpacing: '-0.01em', color: 'var(--gr-text)', marginBottom: '20px', flexShrink: 0,
      }}>
        Transfer History
      </h2>

      {transfers.length === 0 ? (
        <p style={{ color: 'var(--gr-text-3)', fontSize: '14px' }}>
          No transfers yet — waiting for your first bet.
        </p>
      ) : (
        <>
          {/* ── Mobile: card rows ── */}
          <div className="gr-transfer-cards" style={{ flex: 1 }}>
            {visible.map((t) => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: '1px solid var(--gr-border)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', color: 'var(--gr-text)', fontWeight: 500 }}>
                      {t.merchant}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  <span style={{
                    fontSize: '11px', color: 'var(--gr-text-3)',
                    fontFamily: 'var(--font-dm-mono, monospace)',
                  }}>
                    {t.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}${t.triggerAmount.toFixed(2)} bet
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '15px', fontWeight: 500, color: t.status === 'completed' ? 'var(--gr-accent)' : 'var(--gr-text-3)',
                  }}>
                    +${t.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop: table ── */}
          <div className="gr-transfer-table" style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Date', 'Sportsbook', 'Bet', 'Saved', 'Status'].map((h, i) => (
                    <th key={h} style={{
                      padding: '0 0 12px', paddingRight: i < 4 ? '16px' : 0,
                      textAlign: i >= 2 && i <= 3 ? 'right' : 'left',
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: 'var(--gr-text-3)',
                      borderBottom: '1px solid var(--gr-border)', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--gr-border)', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gr-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '13px 16px 13px 0', color: 'var(--gr-text-3)', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {t.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '13px 16px 13px 0', color: 'var(--gr-text-2)' }}>{t.merchant}</td>
                    <td style={{ padding: '13px 16px 13px 0', textAlign: 'right', color: 'var(--gr-text-2)', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '12px' }}>
                      ${t.triggerAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '13px 16px 13px 0', textAlign: 'right', color: 'var(--gr-text)', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '12px', fontWeight: 500 }}>
                      ${t.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '13px 0' }}>
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          />
        </>
      )}
    </div>
  )
}
