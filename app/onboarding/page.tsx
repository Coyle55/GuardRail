'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { TellerConnect } from '@/components/onboarding/TellerConnect'

type Step = 'betting' | 'savings' | 'percentage'

const stepIndex: Record<Step, number> = { betting: 1, savings: 2, percentage: 3 }

function ShieldMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M11 1.5L3 5.5v6c0 4.97 3.5 9.63 8 10.77C16.5 21.13 20 16.47 20 11.5v-6L11 1.5z" fill="#06080C" />
      <path d="M7.5 11.5l2.8 2.8 5-6" stroke="#06080C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="12" width="4" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  )
}

function PiggyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M15 9a5 5 0 01-9.95.5H3.5a1 1 0 010-2H5.1A5.001 5.001 0 0115 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <path d="M15 11l1.5 3H3.5L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PercentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="13.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const stepMeta: Record<Step, { icon: React.ReactNode; title: string; description: string }> = {
  betting: {
    icon: <CardIcon />,
    title: 'Connect your betting account',
    description: 'The debit card you use to fund sportsbook bets. GuardRail monitors this account for betting transactions.',
  },
  savings: {
    icon: <PiggyIcon />,
    title: 'Connect your savings account',
    description: 'Every time a bet is detected, we automatically move your set percentage here.',
  },
  percentage: {
    icon: <PercentIcon />,
    title: 'Set your guardrail',
    description: 'What percentage of each bet should we move to savings?',
  },
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState<Step>('betting')
  const [percentage, setPercentage] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  async function linkAccount(accessToken: string, type: 'betting' | 'savings') {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/teller/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ accessToken, type }),
      })
      if (!res.ok) throw new Error('Failed to link account')
      setStep(type === 'betting' ? 'savings' : 'percentage')
    } catch {
      setError('Failed to link account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        guardrailPercentage: percentage,
        guardrailActive: true,
      })
      router.push('/dashboard')
    } catch {
      setError('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const current = stepIndex[step]
  const meta = stepMeta[step]
  const fillPct = ((percentage - 1) / (50 - 1)) * 100

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 40px',
        overflowY: 'auto',
        background: 'var(--gr-bg)',
        backgroundImage: `
          radial-gradient(ellipse 70% 50% at 50% -10%, rgba(0,232,122,0.08) 0%, transparent 65%),
          radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px',
      }}
    >
      <div className="gr-fade-up" style={{ width: '100%', maxWidth: '440px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px',
            background: 'var(--gr-accent)', borderRadius: '14px',
            marginBottom: '14px',
            boxShadow: '0 0 28px var(--gr-accent-glow)',
          }}>
            <ShieldMark />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em', color: 'var(--gr-text)' }}>
              GuardRail
            </p>
            <p style={{ fontSize: '13px', color: 'var(--gr-text-3)', marginTop: '2px' }}>
              Let's get you set up — 3 quick steps
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--gr-card)',
          border: '1px solid var(--gr-border-md)',
          borderRadius: '20px',
          padding: '28px 24px',
        }}>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{
                height: '3px', flex: 1, borderRadius: '2px',
                background: n <= current ? 'var(--gr-accent)' : 'var(--gr-border-md)',
                transition: 'background 0.4s ease',
                boxShadow: n === current ? '0 0 6px var(--gr-accent-glow)' : 'none',
              }} />
            ))}
          </div>

          {/* Step label */}
          <p style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--gr-text-3)', marginBottom: '16px',
          }}>
            Step {current} of 3
          </p>

          {/* Step icon + title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '38px', height: '38px', flexShrink: 0,
              background: 'var(--gr-accent-dim)',
              border: '1px solid var(--gr-accent-border)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gr-accent)',
            }}>
              {meta.icon}
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: '17px',
                letterSpacing: '-0.01em', color: 'var(--gr-text)', marginBottom: '6px', lineHeight: 1.3,
              }}>
                {meta.title}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--gr-text-2)', lineHeight: 1.55 }}>
                {meta.description}
              </p>
            </div>
          </div>

          {/* Step content */}
          {(step === 'betting' || step === 'savings') && (
            <TellerConnect
              label={step === 'betting' ? 'Connect betting account' : 'Connect savings account'}
              onSuccess={(token) => linkAccount(token, step)}
              disabled={loading}
            />
          )}

          {step === 'percentage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <span style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '60px', fontWeight: 500, color: 'var(--gr-accent)', lineHeight: 1,
                  filter: 'drop-shadow(0 0 16px rgba(0,232,122,0.3))',
                }}>
                  {percentage}%
                </span>
              </div>

              <div>
                <input
                  type="range" min={1} max={50} value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, var(--gr-accent) ${fillPct}%, var(--gr-border-md) ${fillPct}%)`,
                    marginBottom: '6px',
                  }}
                />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '11px', color: 'var(--gr-text-3)',
                  fontFamily: 'var(--font-dm-mono, monospace)',
                }}>
                  <span>1%</span><span>50%</span>
                </div>
              </div>

              <div style={{
                padding: '10px 14px',
                background: 'var(--gr-surface)',
                borderRadius: '10px', border: '1px solid var(--gr-border)',
                fontSize: '13px', color: 'var(--gr-text-2)', textAlign: 'center',
              }}>
                On a $100 bet →{' '}
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontWeight: 500, color: 'var(--gr-text)' }}>
                  ${percentage} saved
                </span>
              </div>

              <button onClick={handleFinish} disabled={loading} className="gr-btn-primary" style={{ marginTop: '4px' }}>
                {loading ? 'Activating…' : 'Activate GuardRail'}
              </button>
            </div>
          )}

          {error && (
            <p style={{
              marginTop: '16px', fontSize: '13px', color: 'var(--gr-red)',
              background: 'var(--gr-red-dim)', padding: '10px 14px', borderRadius: '8px',
            }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
