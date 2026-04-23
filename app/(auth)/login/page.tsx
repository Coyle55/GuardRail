'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase/auth'

function ShieldMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M11 1.5L3 5.5v6c0 4.97 3.5 9.63 8 10.77C16.5 21.13 20 16.47 20 11.5v-6L11 1.5z" fill="#06080C" />
      <path d="M7.5 11.5l2.8 2.8 5-6" stroke="#06080C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.')
        return
      }
      setError(`Google sign-in failed${code ? ` (${code})` : ''}. Please try again.`)
    } finally {
      setGoogleLoading(false)
    }
  }

  const busy = loading || googleLoading

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
      <div className="gr-fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', background: 'var(--gr-accent)', borderRadius: '14px',
            marginBottom: '16px', boxShadow: '0 0 28px var(--gr-accent-glow)',
          }}>
            <ShieldMark />
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--gr-text)', marginBottom: '4px' }}>
            GuardRail
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--gr-text-3)' }}>Automatic savings on every bet</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--gr-card)', border: '1px solid var(--gr-border-md)', borderRadius: '20px', padding: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: '17px', letterSpacing: '-0.01em', marginBottom: '24px', color: 'var(--gr-text)' }}>
            Sign in
          </h2>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '11px 16px',
              background: 'var(--gr-surface)',
              border: '1px solid var(--gr-border-md)',
              borderRadius: '10px',
              color: 'var(--gr-text)',
              fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.5 : 1,
              transition: 'border-color 0.15s, background 0.15s',
              marginBottom: '20px',
            }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.borderColor = 'var(--gr-border-bright)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--gr-border-md)' }}
          >
            <GoogleLogo />
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--gr-border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--gr-text-3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--gr-border)' }} />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="gr-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="gr-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required placeholder="you@example.com" />
            </div>
            <div>
              <label className="gr-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="gr-input" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} required placeholder="••••••••" />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--gr-red)', background: 'var(--gr-red-dim)', padding: '10px 14px', borderRadius: '8px', margin: 0 }}>
                {error}
              </p>
            )}

            <button type="submit" className="gr-btn-primary" disabled={busy} style={{ marginTop: '4px' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--gr-text-3)', marginTop: '20px' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--gr-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
