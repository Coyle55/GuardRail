'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { TellerConnect } from '@/components/onboarding/TellerConnect'

type Step = 'betting' | 'savings' | 'percentage'

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>('betting')
  const [percentage, setPercentage] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function linkAccount(accessToken: string, type: 'betting' | 'savings') {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const idToken = await user.getIdToken()
      const accountsRes = await fetch('https://api.teller.io/accounts', {
        headers: { Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}` },
      })
      const accounts = await accountsRes.json()
      const accountId = accounts[0]?.id

      if (!accountId) throw new Error('No accounts found in enrollment')

      await fetch('/api/teller/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ accessToken, accountId, type }),
      })

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

  const steps: Record<Step, number> = { betting: 1, savings: 2, percentage: 3 }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-xl">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= steps[step] ? 'bg-indigo-500' : 'bg-gray-700'}`}
            />
          ))}
        </div>

        {step === 'betting' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect your betting account</h2>
            <p className="text-gray-400 text-sm mb-6">
              This is the debit card you use to fund your sportsbook bets. GuardRail will monitor this account for betting transactions.
            </p>
            <TellerConnect
              label="Connect betting account"
              onSuccess={(token) => linkAccount(token, 'betting')}
              disabled={loading}
            />
          </div>
        )}

        {step === 'savings' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Connect your savings account</h2>
            <p className="text-gray-400 text-sm mb-6">
              Every time a bet is detected, we'll automatically move your set percentage here.
            </p>
            <TellerConnect
              label="Connect savings account"
              onSuccess={(token) => linkAccount(token, 'savings')}
              disabled={loading}
            />
          </div>
        )}

        {step === 'percentage' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Set your guardrail</h2>
            <p className="text-gray-400 text-sm mb-6">
              What percentage of each bet should we move to savings?
            </p>
            <div className="text-center mb-6">
              <span className="text-6xl font-bold text-indigo-400">{percentage}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full accent-indigo-500 mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mb-8">
              <span>1%</span>
              <span>50%</span>
            </div>
            <p className="text-sm text-gray-400 text-center mb-6">
              On a $100 bet → <span className="text-white font-semibold">${percentage} saved</span>
            </p>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl transition"
            >
              {loading ? 'Saving…' : 'Activate GuardRail'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
      </div>
    </main>
  )
}
