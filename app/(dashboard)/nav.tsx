'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/firebase/auth'

function ShieldMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 1.5L3 4.5v4.5c0 3.728 2.632 7.214 6 8.076C12.368 16.214 15 12.728 15 9V4.5L9 1.5z" fill="#06080C" />
      <path d="M6 9.25l2.2 2.25 3.8-4.5" stroke="#39FF9A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Nav() {
  const { user, logOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await logOut()
    router.push('/login')
  }

  const initial = (user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()

  return (
    <header className="gr-header">
      {/* Brand */}
      <Link href="/dashboard" className="gr-header-brand">
        <div className="gr-header-shield">
          <ShieldMark />
        </div>
        <span className="gr-header-wordmark">GuardRail</span>
      </Link>

      {/* Avatar + dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="gr-avatar"
          aria-label="Account menu"
          aria-expanded={open}
        >
          {initial}
        </button>

        {open && (
          <div className="gr-dropdown">
            <Link
              href="/settings"
              className="gr-dropdown-item"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="gr-dropdown-item gr-dropdown-item--button"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
