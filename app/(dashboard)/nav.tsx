'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'

function ShieldMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 1.5L3 4.5v4.5c0 3.728 2.632 7.214 6 8.076C12.368 16.214 15 12.728 15 9V4.5L9 1.5z" fill="#06080C" />
      <path d="M6 9.25l2.2 2.25 3.8-4.5" stroke="#06080C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DashIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

function GearIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.11 3.11l1.06 1.06M10.83 10.83l1.06 1.06M3.11 11.89l1.06-1.06M10.83 4.17l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SignOutIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M5.5 13H3a1 1 0 01-1-1V3a1 1 0 011-1h2.5M10 10.5L13 7.5l-3-3M13 7.5H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashIcon },
  { href: '/settings',  label: 'Settings',  Icon: GearIcon },
]

export default function Nav() {
  const { logOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await logOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="gr-sidebar">
        <div style={{ paddingLeft: '10px', marginBottom: '36px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'var(--gr-accent)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 0 16px var(--gr-accent-glow)',
          }}>
            <ShieldMark />
          </div>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em', color: 'var(--gr-text)' }}>
            GuardRail
          </span>
        </div>

        <ul style={{ flex: 1, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link href={href} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--gr-text)' : 'var(--gr-text-2)',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: `2px solid ${active ? 'var(--gr-accent)' : 'transparent'}`,
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  <Icon />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '13px', color: 'var(--gr-text-3)', width: '100%', textAlign: 'left',
          borderRadius: '10px', fontFamily: 'inherit', transition: 'color 0.15s',
        }}>
          <SignOutIcon />
          Sign out
        </button>
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="gr-bottom-nav" aria-label="Main navigation">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`gr-bottom-nav-item${active ? ' active' : ''}`}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
        <button onClick={handleSignOut} className="gr-bottom-nav-item">
          <SignOutIcon size={18} />
          Sign out
        </button>
      </nav>
    </>
  )
}
