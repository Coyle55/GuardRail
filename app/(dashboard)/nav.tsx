'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'

export default function Nav() {
  const { logOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await logOut()
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col p-6">
      <div className="mb-10">
        <span className="text-xl font-bold text-white">GuardRail</span>
      </div>
      <ul className="flex-1 space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition ${
                pathname === item.href
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSignOut}
        className="mt-auto text-sm text-gray-500 hover:text-white transition text-left px-4 py-2"
      >
        Sign out
      </button>
    </nav>
  )
}
