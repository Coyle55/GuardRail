import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/lib/firebase/auth'
import { Transfer } from '@/types'

export function useTransfers() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTransfers([])
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'users', user.uid, 'transfers'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setTransfers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transfer))
      )
      setLoading(false)
    })
    return unsub
  }, [user])

  return { transfers, loading }
}
