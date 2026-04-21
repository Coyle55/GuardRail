'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'
import { useUserProfile } from '@/hooks/useUserProfile'
import Nav from './nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()

  useEffect(() => {
    if (loading || profileLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (profile && (!profile.tellerBettingAccountId || !profile.tellerSavingsAccountId)) {
      router.replace('/onboarding')
    }
  }, [user, loading, profile, profileLoading, router])

  if (loading || profileLoading || !user) return null

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Nav />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
