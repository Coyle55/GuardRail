import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/lib/firebase/auth'
import { UserProfile } from '@/types'

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    // Wait for a server-confirmed snapshot before resolving.
    // Pure cache hits can be stale (e.g. account IDs written by the admin
    // SDK during onboarding won't be in the client cache yet).
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.fromCache && !snap.metadata.hasPendingWrites) return
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
        setLoading(false)
      }
    )

    // Safety valve: if the server hasn't responded in 5 s (e.g. offline),
    // unblock the UI with whatever data we have.
    const fallback = setTimeout(() => setLoading(false), 5000)

    return () => {
      unsub()
      clearTimeout(fallback)
    }
  }, [user])

  return { profile, loading }
}
