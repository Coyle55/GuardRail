'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase/auth'

function ShieldMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path
        d="M11 1.5L3 5.5v6c0 4.97 3.5 9.63 8 10.77C16.5 21.13 20 16.47 20 11.5v-6L11 1.5z"
        fill="#06080C"
      />
      <path
        d="M7.5 11.5l2.8 2.8 5-6"
        stroke="#06080C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function SignupPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, name)
      router.push('/onboarding')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--gr-bg)',
        backgroundImage: `
          radial-gradient(ellipse 70% 50% at 50% -10%, rgba(0,232,122,0.08) 0%, transparent 65%),
          radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px',
      }}
    >
      <div className="gr-fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              background: 'var(--gr-accent)',
              borderRadius: '14px',
              marginBottom: '16px',
              boxShadow: '0 0 28px var(--gr-accent-glow)',
            }}
          >
            <ShieldMark />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '20px',
              letterSpacing: '-0.02em',
              color: 'var(--gr-text)',
              marginBottom: '4px',
            }}
          >
            GuardRail
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--gr-text-3)' }}>
            Automatic savings on every bet
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--gr-card)',
            border: '1px solid var(--gr-border-md)',
            borderRadius: '20px',
            padding: '32px',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 600,
              fontSize: '17px',
              letterSpacing: '-0.01em',
              marginBottom: '24px',
              color: 'var(--gr-text)',
            }}
          >
            Create account
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="gr-label" htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                className="gr-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="gr-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="gr-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="gr-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="gr-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                placeholder="Min. 8 characters"
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--gr-red)',
                  background: 'var(--gr-red-dim)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" className="gr-btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--gr-text-3)', marginTop: '20px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--gr-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
