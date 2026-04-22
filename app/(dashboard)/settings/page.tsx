'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function SettingsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [percentage, setPercentage] = useState(20)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setPercentage(profile.guardrailPercentage)
      setActive(profile.guardrailActive)
    }
  }, [profile])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ guardrailPercentage: percentage, guardrailActive: active }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const fillPct = ((percentage - 1) / (50 - 1)) * 100

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1
        className="gr-fade-up"
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: '22px',
          letterSpacing: '-0.02em',
          color: 'var(--gr-text)',
          marginBottom: '28px',
        }}
      >
        Settings
      </h1>

      <div className="gr-fade-up-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Top row: toggle + percentage side-by-side on desktop */}
        <div className="gr-settings-top">

          {/* GuardRail Active toggle */}
          <div style={{
            background: 'var(--gr-card)',
            border: '1px solid var(--gr-border)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gr-text)', marginBottom: '6px' }}>
                GuardRail Active
              </p>
              <p style={{ fontSize: '13px', color: 'var(--gr-text-3)', lineHeight: 1.5 }}>
                Pause to stop automatic transfers temporarily.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={() => setActive((a) => !a)}
                aria-label={active ? 'Deactivate GuardRail' : 'Activate GuardRail'}
                style={{
                  position: 'relative',
                  width: '48px',
                  height: '26px',
                  borderRadius: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--gr-accent)' : 'var(--gr-elevated)',
                  boxShadow: active ? '0 0 14px var(--gr-accent-glow)' : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  left: active ? '25px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: active ? '#06080C' : 'var(--gr-text-3)',
                  transition: 'left 0.2s ease, background 0.2s',
                }} />
              </button>
              <span style={{ fontSize: '13px', color: active ? 'var(--gr-accent)' : 'var(--gr-text-3)', fontWeight: 500, transition: 'color 0.2s' }}>
                {active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Percentage slider */}
          <div style={{
            background: 'var(--gr-card)',
            border: '1px solid var(--gr-border)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gr-text)' }}>
              Guardrail Percentage
            </p>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '56px',
                fontWeight: 500,
                color: 'var(--gr-accent)',
                lineHeight: 1,
                filter: 'drop-shadow(0 0 16px rgba(0,232,122,0.28))',
              }}>
                {percentage}%
              </span>
            </div>
            <div>
              <input
                type="range"
                min={1}
                max={50}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--gr-accent) ${fillPct}%, var(--gr-border-md) ${fillPct}%)`,
                  marginBottom: '6px',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--gr-text-3)',
                fontFamily: 'var(--font-dm-mono, monospace)',
              }}>
                <span>1%</span>
                <span>50%</span>
              </div>
            </div>
            <div style={{
              padding: '10px 14px',
              background: 'var(--gr-surface)',
              borderRadius: '10px',
              border: '1px solid var(--gr-border)',
              fontSize: '13px',
              color: 'var(--gr-text-2)',
              textAlign: 'center',
            }}>
              On a $100 bet →{' '}
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontWeight: 500, color: 'var(--gr-text)' }}>
                ${percentage} saved
              </span>
            </div>
          </div>
        </div>

        {/* Linked accounts */}
        {profile && (
          <div style={{
            background: 'var(--gr-card)',
            border: '1px solid var(--gr-border)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--gr-text)', marginBottom: '16px' }}>
              Linked Accounts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Betting account', value: profile.tellerBettingAccountId },
                { label: 'Savings account', value: profile.tellerSavingsAccountId },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--gr-surface)',
                  borderRadius: '10px',
                  border: '1px solid var(--gr-border)',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--gr-text-3)' }}>{label}</span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '13px',
                    color: value ? 'var(--gr-text)' : 'var(--gr-text-3)',
                  }}>
                    {value ? `••••${value.slice(-4)}` : 'Not linked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="gr-btn-primary gr-btn-settings"
            style={{ background: saved ? 'rgba(0,232,122,0.85)' : 'var(--gr-accent)' }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--gr-red)', marginTop: '12px' }}>{error}</p>
          )}
        </div>

      </div>
    </div>
  )
}
