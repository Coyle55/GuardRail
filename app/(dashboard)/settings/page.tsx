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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      <div className="max-w-lg space-y-6">
        {/* Guardrail Toggle */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">GuardRail Active</h2>
              <p className="text-gray-400 text-sm mt-1">
                Pause to stop automatic transfers temporarily.
              </p>
            </div>
            <button
              onClick={() => setActive((a) => !a)}
              className={`relative w-12 h-6 rounded-full transition ${
                active ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  active ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Percentage Slider */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">Guardrail Percentage</h2>
          <div className="text-center mb-4">
            <span className="text-5xl font-bold text-indigo-400">{percentage}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            className="w-full accent-indigo-500 mb-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1%</span>
            <span>50%</span>
          </div>
          <p className="text-sm text-gray-400 text-center mt-3">
            On a $100 bet → <span className="text-white font-semibold">${percentage} saved</span>
          </p>
        </div>

        {/* Linked Accounts Summary */}
        {profile && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-white font-semibold mb-4">Linked Accounts</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Betting account</span>
                <span className="text-gray-300 font-mono">
                  {profile.tellerBettingAccountId
                    ? `••••${profile.tellerBettingAccountId.slice(-4)}`
                    : 'Not linked'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Savings account</span>
                <span className="text-gray-300 font-mono">
                  {profile.tellerSavingsAccountId
                    ? `••••${profile.tellerSavingsAccountId.slice(-4)}`
                    : 'Not linked'}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
      </div>
    </div>
  )
}
