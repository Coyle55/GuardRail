# GuardRail v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GuardRail — a Next.js dashboard that monitors a user's sports betting debit account via Teller.io and automatically moves a configurable percentage of each detected bet into their savings account.

**Architecture:** Next.js 14 (App Router) on Vercel for the frontend. Firebase Auth for login, Firestore for all user data and transfer history, Firebase Cloud Functions v2 for the webhook handler. Teller.io handles both bank account monitoring (transaction webhooks) and ACH transfer initiation. A Cloud Function receives Teller webhooks, detects sportsbook merchants, and initiates the savings transfer.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript, Firebase (Auth + Firestore + Cloud Functions v2), Teller.io, Recharts, Jest, React Testing Library

---

## File Map

**Next.js App**
- `package.json` — root dependencies
- `tsconfig.json` — TypeScript config
- `tailwind.config.ts` — Tailwind config
- `.env.local.example` — env var template
- `firebase.json` — Firebase project config
- `.firebaserc` — Firebase project alias
- `firestore.rules` — Firestore security rules
- `jest.config.ts` — Jest config (frontend tests)
- `jest.setup.ts` — RTL setup
- `types/index.ts` — shared TypeScript types (UserProfile, Transfer)
- `lib/firebase/client.ts` — Firebase client SDK init (auth + Firestore)
- `lib/firebase/admin.ts` — Firebase Admin SDK init (for API routes)
- `lib/firebase/auth.tsx` — AuthProvider + useAuth hook
- `lib/sportsbooks.ts` — hardcoded merchant list + isSportsbookTransaction() + normalizeMerchantName()
- `lib/sportsbooks.test.ts` — Jest unit tests for merchant detection
- `lib/transfer.ts` — calculateGuardrailAmount()
- `lib/transfer.test.ts` — Jest unit tests for amount calculation
- `hooks/useTransfers.ts` — Firestore real-time subscription for transfers subcollection
- `hooks/useUserProfile.ts` — Firestore real-time subscription for user doc
- `app/layout.tsx` — root layout with AuthProvider + Teller Connect script
- `app/page.tsx` — root redirect (→ /dashboard if authed, → /login if not)
- `app/(auth)/login/page.tsx` — login form
- `app/(auth)/signup/page.tsx` — signup form
- `app/(dashboard)/layout.tsx` — protected layout with auth guard + onboarding redirect
- `app/(dashboard)/nav.tsx` — sidebar navigation
- `app/(dashboard)/dashboard/page.tsx` — main dashboard page
- `app/(dashboard)/settings/page.tsx` — settings page
- `app/onboarding/page.tsx` — multi-step account linking (betting → savings → percentage)
- `app/api/teller/link/route.ts` — receives Teller access token, stores securely via Admin SDK
- `app/api/user/settings/route.ts` — updates guardrail percentage + active state
- `components/onboarding/TellerConnect.tsx` — Teller Connect widget wrapper
- `components/dashboard/HeaderStrip.tsx` — totals: saved all-time, saved this month, bets detected
- `components/dashboard/SavingsChart.tsx` — Recharts cumulative savings line chart
- `components/dashboard/SportsbookBreakdown.tsx` — per-merchant totals
- `components/dashboard/TransferHistory.tsx` — paginated transfer list

**Firebase Cloud Functions** (`functions/` directory — separate Node.js package)
- `functions/package.json`
- `functions/tsconfig.json`
- `functions/jest.config.ts`
- `functions/src/index.ts` — exports all Cloud Functions
- `functions/src/lib/sportsbooks.ts` — merchant list (duplicated for Cloud Function bundle isolation)
- `functions/src/lib/transfer.ts` — calculateGuardrailAmount() (duplicated)
- `functions/src/webhook.ts` — Teller webhook handler (core business logic)
- `functions/src/webhook.test.ts` — Jest unit tests for webhook logic

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `.env.local.example`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/jest.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

Expected: Next.js 14 project created with TypeScript and Tailwind. Answer prompts: no `src/` directory, use `@/*` alias.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install firebase recharts
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest
```

- [ ] **Step 3: Install Firebase CLI and initialize**

```bash
npm install -g firebase-tools
firebase login
firebase init
```

When prompted:
- Select: **Firestore**, **Functions**, **Emulators**
- Use existing project or create new Firebase project
- Functions language: **TypeScript**
- Emulators: **Firestore**, **Functions**

- [ ] **Step 4: Install Cloud Functions dependencies**

```bash
cd functions
npm install firebase-admin firebase-functions
npm install --save-dev jest @types/jest ts-jest
cd ..
```

- [ ] **Step 5: Write `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
# Firebase (client-side — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Teller.io (client-side)
NEXT_PUBLIC_TELLER_APP_ID=

# Firebase Admin SDK (server-side — never expose)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
EOF
```

- [ ] **Step 6: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Transfers subcollection: user can read, only Cloud Functions write
      match /transfers/{transferId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false;
      }

      // Private subcollection: no client access ever
      match /private/{document} {
        allow read, write: if false;
      }
    }
  }
}
```

- [ ] **Step 7: Write `jest.config.ts` (frontend)**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/lib/**/*.test.ts',
    '<rootDir>/components/**/*.test.tsx',
    '<rootDir>/hooks/**/*.test.ts',
  ],
}

export default createJestConfig(config)
```

- [ ] **Step 8: Write `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Write `functions/jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
}

export default config
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Firebase and Cloud Functions"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write `types/index.ts`**

```typescript
import { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  email: string
  displayName: string
  guardrailPercentage: number
  guardrailActive: boolean
  tellerBettingAccountId: string | null
  tellerSavingsAccountId: string | null
  createdAt: Timestamp
}

export interface Transfer {
  id: string
  amount: number
  triggerAmount: number
  merchant: string
  status: 'pending' | 'completed' | 'failed'
  tellerTransactionId: string
  tellerTransferId: string | null
  fee: number | null
  createdAt: Timestamp
}

export interface TellerEnrollment {
  accessToken: string
  user: { id: string }
  enrollment: { id: string; institution: { name: string } }
}

export interface TellerAccount {
  id: string
  name: string
  type: string
  subtype: string
  institution: { name: string }
  last_four: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Firebase Client Setup + Auth Provider

**Files:**
- Create: `lib/firebase/client.ts`
- Create: `lib/firebase/admin.ts`
- Create: `lib/firebase/auth.tsx`

- [ ] **Step 1: Write `lib/firebase/client.ts`**

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
```

- [ ] **Step 2: Write `lib/firebase/admin.ts`**

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()
```

- [ ] **Step 3: Write `lib/firebase/auth.tsx`**

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', newUser.uid), {
      email,
      displayName,
      guardrailPercentage: 20,
      guardrailActive: false,
      tellerBettingAccountId: null,
      tellerSavingsAccountId: null,
      createdAt: serverTimestamp(),
    })
  }

  async function logOut() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Firebase client init and AuthProvider"
```

---

## Task 4: Sportsbook Detection + Transfer Calculation (with tests)

**Files:**
- Create: `lib/sportsbooks.ts`
- Create: `lib/sportsbooks.test.ts`
- Create: `lib/transfer.ts`
- Create: `lib/transfer.test.ts`
- Create: `functions/src/lib/sportsbooks.ts` (copy)
- Create: `functions/src/lib/transfer.ts` (copy)

- [ ] **Step 1: Write the failing tests for sportsbook detection**

Create `lib/sportsbooks.test.ts`:

```typescript
import { isSportsbookTransaction, normalizeMerchantName } from './sportsbooks'

describe('isSportsbookTransaction', () => {
  it('matches DraftKings (uppercase)', () => {
    expect(isSportsbookTransaction('DRAFTKINGS')).toBe(true)
  })
  it('matches FanDuel with extra text', () => {
    expect(isSportsbookTransaction('FanDuel Sportsbook LLC')).toBe(true)
  })
  it('matches BetMGM', () => {
    expect(isSportsbookTransaction('BETMGM LLC')).toBe(true)
  })
  it('does not match unrelated merchants', () => {
    expect(isSportsbookTransaction('Starbucks')).toBe(false)
  })
  it('does not match empty string', () => {
    expect(isSportsbookTransaction('')).toBe(false)
  })
})

describe('normalizeMerchantName', () => {
  it('returns "Draftkings" for DRAFTKINGS', () => {
    expect(normalizeMerchantName('DRAFTKINGS')).toBe('Draftkings')
  })
  it('returns "Fanduel" for FanDuel Sportsbook', () => {
    expect(normalizeMerchantName('FanDuel Sportsbook')).toBe('Fanduel')
  })
  it('returns original name for unknown merchant', () => {
    expect(normalizeMerchantName('Starbucks')).toBe('Starbucks')
  })
})
```

- [ ] **Step 2: Run the tests — expect failure**

```bash
npx jest lib/sportsbooks.test.ts
```

Expected: `Cannot find module './sportsbooks'`

- [ ] **Step 3: Write `lib/sportsbooks.ts`**

```typescript
export const SPORTSBOOK_MERCHANTS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'pointsbet',
  'caesars',
  'espn bet',
  'bet365',
  'barstool',
  'betrivers',
  'hard rock bet',
  'fliff',
  'fanatics',
  'underdog',
]

export function isSportsbookTransaction(merchantName: string): boolean {
  if (!merchantName) return false
  const normalized = merchantName.toLowerCase()
  return SPORTSBOOK_MERCHANTS.some((m) => normalized.includes(m))
}

export function normalizeMerchantName(merchantName: string): string {
  const normalized = merchantName.toLowerCase()
  const match = SPORTSBOOK_MERCHANTS.find((m) => normalized.includes(m))
  if (!match) return merchantName
  return match.charAt(0).toUpperCase() + match.slice(1)
}
```

- [ ] **Step 4: Run the tests — expect pass**

```bash
npx jest lib/sportsbooks.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 5: Write the failing tests for transfer calculation**

Create `lib/transfer.test.ts`:

```typescript
import { calculateGuardrailAmount } from './transfer'

describe('calculateGuardrailAmount', () => {
  it('calculates 20% of $5.00 as $1.00', () => {
    expect(calculateGuardrailAmount(5, 20)).toBe(1)
  })
  it('calculates 20% of $7.00 as $1.40', () => {
    expect(calculateGuardrailAmount(7, 20)).toBe(1.4)
  })
  it('rounds to 2 decimal places', () => {
    expect(calculateGuardrailAmount(10, 33)).toBe(3.3)
  })
  it('handles 0%', () => {
    expect(calculateGuardrailAmount(10, 0)).toBe(0)
  })
  it('handles 50%', () => {
    expect(calculateGuardrailAmount(100, 50)).toBe(50)
  })
})
```

- [ ] **Step 6: Run the tests — expect failure**

```bash
npx jest lib/transfer.test.ts
```

Expected: `Cannot find module './transfer'`

- [ ] **Step 7: Write `lib/transfer.ts`**

```typescript
export function calculateGuardrailAmount(betAmount: number, percentage: number): number {
  return Math.round(betAmount * (percentage / 100) * 100) / 100
}
```

- [ ] **Step 8: Run the tests — expect pass**

```bash
npx jest lib/transfer.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 9: Copy to Cloud Functions bundle**

```bash
mkdir -p functions/src/lib
cp lib/sportsbooks.ts functions/src/lib/sportsbooks.ts
cp lib/transfer.ts functions/src/lib/transfer.ts
```

- [ ] **Step 10: Commit**

```bash
git add lib/ functions/src/lib/
git commit -m "feat: add sportsbook detection and guardrail amount calculation with tests"
```

---

## Task 5: Auth Pages (Login + Signup)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Update `app/layout.tsx`** — add AuthProvider and Teller Connect script

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { AuthProvider } from '@/lib/firebase/auth'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GuardRail',
  description: 'Automatic savings on every bet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src="https://cdn.teller.io/connect/connect.js" strategy="beforeInteractive" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Write `app/page.tsx`** — root redirect

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return null
}
```

- [ ] **Step 3: Write `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase/auth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6">Sign in to GuardRail</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-400 text-center">
          No account?{' '}
          <Link href="/signup" className="text-indigo-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Write `app/(auth)/signup/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase/auth'

export default function SignupPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, name)
      router.push('/onboarding')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-400 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add auth layout, login, and signup pages"
```

---

## Task 6: Firestore Hooks

**Files:**
- Create: `hooks/useUserProfile.ts`
- Create: `hooks/useTransfers.ts`

- [ ] **Step 1: Write `hooks/useUserProfile.ts`**

```typescript
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
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { profile, loading }
}
```

- [ ] **Step 2: Write `hooks/useTransfers.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add hooks/
git commit -m "feat: add Firestore real-time hooks for user profile and transfers"
```

---

## Task 7: Protected Dashboard Layout + Navigation

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/nav.tsx`

- [ ] **Step 1: Write `app/(dashboard)/nav.tsx`**

```typescript
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
```

- [ ] **Step 2: Write `app/(dashboard)/layout.tsx`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/
git commit -m "feat: add protected dashboard layout and sidebar navigation"
```

---

## Task 8: Teller Account Linking (API Route + Onboarding UI)

**Files:**
- Create: `app/api/teller/link/route.ts`
- Create: `components/onboarding/TellerConnect.tsx`
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Write `app/api/teller/link/route.ts`**

This route receives a Teller access token from the frontend, fetches the account's routing/account numbers from Teller (for the savings account), and stores everything securely in Firestore using the Admin SDK.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let uid: string
  try {
    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { accessToken, accountId, type } = await req.json()

  if (!accessToken || !accountId || !['betting', 'savings'].includes(type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const basicAuth = Buffer.from(`${accessToken}:`).toString('base64')

  // For savings account, fetch routing/account numbers so Cloud Function
  // can initiate transfers without an extra Teller call on each webhook.
  let savingsDetails: { routing_number: string; account_number: string } | null = null
  if (type === 'savings') {
    const detailsRes = await fetch(`https://api.teller.io/accounts/${accountId}/details`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    if (!detailsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch account details from Teller' }, { status: 502 })
    }
    savingsDetails = await detailsRes.json()
  }

  const batch = adminDb.batch()
  const privateRef = adminDb.doc(`users/${uid}/private/teller`)
  const userRef = adminDb.doc(`users/${uid}`)

  if (type === 'betting') {
    batch.set(privateRef, { bettingAccessToken: accessToken }, { merge: true })
    batch.set(userRef, { tellerBettingAccountId: accountId }, { merge: true })
  } else {
    batch.set(
      privateRef,
      {
        savingsAccessToken: accessToken,
        savingsRoutingNumber: savingsDetails!.routing_number,
        savingsAccountNumber: savingsDetails!.account_number,
      },
      { merge: true }
    )
    batch.set(userRef, { tellerSavingsAccountId: accountId }, { merge: true })
  }

  await batch.commit()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `components/onboarding/TellerConnect.tsx`**

```typescript
'use client'

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: {
        applicationId: string
        onSuccess: (enrollment: { accessToken: string }) => void
        onExit?: () => void
      }) => { open: () => void }
    }
  }
}

interface Props {
  onSuccess: (accessToken: string) => void
  label: string
  disabled?: boolean
}

export function TellerConnect({ onSuccess, label, disabled }: Props) {
  function handleClick() {
    const connect = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
      onSuccess: (enrollment) => onSuccess(enrollment.accessToken),
    })
    connect.open()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl transition"
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Write `app/onboarding/page.tsx`**

```typescript
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
      // Teller Connect gives the access token but not the account ID directly.
      // Fetch the accounts list to let the user pick, or use the first account.
      // For v1: use the first account in the enrollment.
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

  const steps = { betting: 1, savings: 2, percentage: 3 }

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
```

- [ ] **Step 4: Commit**

```bash
git add app/api/ components/onboarding/ app/onboarding/
git commit -m "feat: add Teller account linking API route and onboarding flow"
```

---

## Task 9: Cloud Functions — Webhook Handler

**Files:**
- Modify: `functions/src/index.ts`
- Create: `functions/src/webhook.ts`
- Create: `functions/src/webhook.test.ts`

- [ ] **Step 1: Write the failing tests for webhook logic**

Create `functions/src/webhook.test.ts`:

```typescript
import { verifyTellerSignature, buildTransferPayload } from './webhook'
import { isSportsbookTransaction, normalizeMerchantName } from './lib/sportsbooks'
import { calculateGuardrailAmount } from './lib/transfer'
import * as crypto from 'crypto'

describe('verifyTellerSignature', () => {
  const secret = 'test-secret'

  function makeHeader(payload: string): string {
    const timestamp = '1700000000'
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${timestamp}.${payload}`)
    const sig = hmac.digest('hex')
    return `t=${timestamp},v1=${sig}`
  }

  it('returns true for a valid signature', () => {
    const payload = '{"test":"data"}'
    const header = makeHeader(payload)
    expect(verifyTellerSignature(payload, header, secret)).toBe(true)
  })

  it('returns false for a tampered payload', () => {
    const header = makeHeader('{"test":"data"}')
    expect(verifyTellerSignature('{"test":"tampered"}', header, secret)).toBe(false)
  })

  it('returns false for missing header', () => {
    expect(verifyTellerSignature('payload', '', secret)).toBe(false)
  })
})

describe('buildTransferPayload', () => {
  it('builds a valid transfer payload', () => {
    const result = buildTransferPayload({
      betAmount: 5,
      percentage: 20,
      merchant: 'DRAFTKINGS',
      tellerTransactionId: 'txn_123',
    })
    expect(result.amount).toBe(1)
    expect(result.triggerAmount).toBe(5)
    expect(result.merchant).toBe('Draftkings')
    expect(result.status).toBe('pending')
    expect(result.tellerTransactionId).toBe('txn_123')
    expect(result.tellerTransferId).toBeNull()
    expect(result.fee).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests — expect failure**

```bash
cd functions && npx jest src/webhook.test.ts
```

Expected: `Cannot find module './webhook'`

- [ ] **Step 3: Write `functions/src/webhook.ts`**

```typescript
import * as crypto from 'crypto'
import * as admin from 'firebase-admin'
import { normalizeMerchantName } from './lib/sportsbooks'
import { calculateGuardrailAmount } from './lib/transfer'

export function verifyTellerSignature(payload: string, header: string, secret: string): boolean {
  if (!header) return false
  const parts = header.split(',')
  const timestamp = parts[0]?.split('=')[1]
  const signature = parts[1]?.split('=')[1]
  if (!timestamp || !signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(`${timestamp}.${payload}`)
  const expected = hmac.digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

interface TransferPayloadInput {
  betAmount: number
  percentage: number
  merchant: string
  tellerTransactionId: string
}

export function buildTransferPayload(input: TransferPayloadInput) {
  return {
    amount: calculateGuardrailAmount(input.betAmount, input.percentage),
    triggerAmount: input.betAmount,
    merchant: normalizeMerchantName(input.merchant),
    status: 'pending' as const,
    tellerTransactionId: input.tellerTransactionId,
    tellerTransferId: null,
    fee: null,
  }
}

export async function processTellerWebhook(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string,
  db: admin.firestore.Firestore
): Promise<{ status: number; message: string }> {
  const secret = process.env.TELLER_SIGNING_SECRET ?? ''

  if (!verifyTellerSignature(rawBody, signatureHeader, secret)) {
    return { status: 401, message: 'Invalid signature' }
  }

  if (body.type !== 'transaction.created') {
    return { status: 200, message: 'ignored' }
  }

  const payload = body.payload as Record<string, unknown>
  const accountId = payload.account_id as string
  const transactionId = payload.id as string
  const amountStr = payload.amount as string
  const details = payload.details as Record<string, unknown>
  const counterparty = details?.counterparty as Record<string, unknown> | undefined
  const merchantName = (counterparty?.name as string) ?? ''
  const betAmount = Math.abs(parseFloat(amountStr))

  // Deduplication
  const existing = await db
    .collectionGroup('transfers')
    .where('tellerTransactionId', '==', transactionId)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { status: 200, message: 'already processed' }
  }

  // Find user by betting account ID
  const userSnap = await db
    .collection('users')
    .where('tellerBettingAccountId', '==', accountId)
    .limit(1)
    .get()

  if (userSnap.empty) {
    return { status: 200, message: 'no user for account' }
  }

  const userDoc = userSnap.docs[0]
  const userId = userDoc.id
  const userData = userDoc.data()

  if (!userData.guardrailActive) {
    return { status: 200, message: 'guardrail paused' }
  }

  if (!isSportsbookTransaction(merchantName)) {
    return { status: 200, message: 'not a sportsbook transaction' }
  }

  // Get private Teller credentials
  const privateSnap = await db.doc(`users/${userId}/private/teller`).get()
  const privateData = privateSnap.data()

  if (!privateData?.bettingAccessToken || !privateData?.savingsRoutingNumber) {
    return { status: 200, message: 'missing teller credentials' }
  }

  // Write pending transfer
  const transferPayload = buildTransferPayload({
    betAmount,
    percentage: userData.guardrailPercentage,
    merchant: merchantName,
    tellerTransactionId: transactionId,
  })

  const transferRef = db.collection(`users/${userId}/transfers`).doc()
  await transferRef.set({
    ...transferPayload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Initiate ACH transfer via Teller
  try {
    const tellerRes = await fetch(`https://api.teller.io/accounts/${accountId}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateData.bettingAccessToken}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: privateData.savingsAccountNumber,
        routing_number: privateData.savingsRoutingNumber,
        counterparty_name: 'GuardRail Savings',
        amount: transferPayload.amount.toFixed(2),
        memo: 'GuardRail automatic savings',
      }),
    })

    if (tellerRes.ok) {
      const payment = await tellerRes.json()
      await transferRef.update({ status: 'completed', tellerTransferId: payment.id })
    } else {
      await transferRef.update({ status: 'failed' })
    }
  } catch {
    await transferRef.update({ status: 'failed' })
  }

  return { status: 200, message: 'ok' }
}
```

- [ ] **Step 4: Write `functions/src/index.ts`**

```typescript
import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { processTellerWebhook } from './webhook'

admin.initializeApp()
const db = admin.firestore()

export const tellerWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const rawBody = JSON.stringify(req.body)
  const signatureHeader = req.headers['teller-signature'] as string ?? ''

  const result = await processTellerWebhook(req.body, rawBody, signatureHeader, db)
  res.status(result.status).send(result.message)
})
```

- [ ] **Step 5: Run the tests — expect pass**

```bash
cd functions && npx jest src/webhook.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 6: Commit**

```bash
cd ..
git add functions/src/
git commit -m "feat: add Teller webhook Cloud Function with signature verification and transfer logic"
```

---

## Task 10: Dashboard — Header Strip + Sportsbook Breakdown

**Files:**
- Create: `components/dashboard/HeaderStrip.tsx`
- Create: `components/dashboard/SportsbookBreakdown.tsx`

- [ ] **Step 1: Write `components/dashboard/HeaderStrip.tsx`**

```typescript
import { Transfer } from '@/types'
import { useMemo } from 'react'

interface Props {
  transfers: Transfer[]
}

export function HeaderStrip({ transfers: allTransfers }: Props) {
  const completed = useMemo(
    () => allTransfers.filter((t) => t.status === 'completed'),
    [allTransfers]
  )

  const totalSaved = useMemo(
    () => completed.reduce((sum, t) => sum + t.amount, 0),
    [completed]
  )

  const thisMonth = useMemo(() => {
    const now = new Date()
    return completed
      .filter((t) => {
        const d = t.createdAt.toDate()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }, [completed])

  const stats = [
    { label: 'Saved all-time', value: `$${totalSaved.toFixed(2)}` },
    { label: 'Saved this month', value: `$${thisMonth.toFixed(2)}` },
    { label: 'Bets detected', value: allTransfers.length.toString() },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-white">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write `components/dashboard/SportsbookBreakdown.tsx`**

```typescript
import { Transfer } from '@/types'
import { useMemo } from 'react'

interface Props {
  transfers: Transfer[]
}

export function SportsbookBreakdown({ transfers }: Props) {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>()
    transfers
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount)
      })
    return Array.from(map.entries())
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
  }, [transfers])

  if (breakdown.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">By Sportsbook</h2>
        <p className="text-gray-500 text-sm">No transfers yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">By Sportsbook</h2>
      <ul className="space-y-3">
        {breakdown.map(({ merchant, total }) => (
          <li key={merchant} className="flex justify-between items-center">
            <span className="text-gray-300 text-sm">{merchant}</span>
            <span className="text-white font-semibold">${total.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/HeaderStrip.tsx components/dashboard/SportsbookBreakdown.tsx
git commit -m "feat: add HeaderStrip and SportsbookBreakdown dashboard components"
```

---

## Task 11: Dashboard — Savings Chart

**Files:**
- Create: `components/dashboard/SavingsChart.tsx`

- [ ] **Step 1: Write `components/dashboard/SavingsChart.tsx`**

```typescript
'use client'

import { Transfer } from '@/types'
import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  transfers: Transfer[]
}

type Period = 'weekly' | 'monthly'

function formatKey(date: Date, period: Period): string {
  if (period === 'monthly') {
    return date.toLocaleString('default', { month: 'short', year: '2-digit' })
  }
  // ISO week: YYYY-Www
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `W${week} '${String(d.getUTCFullYear()).slice(2)}`
}

export function SavingsChart({ transfers }: Props) {
  const [period, setPeriod] = useState<Period>('weekly')

  const data = useMemo(() => {
    const map = new Map<string, number>()
    transfers
      .filter((t) => t.status === 'completed')
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
      .forEach((t) => {
        const key = formatKey(t.createdAt.toDate(), period)
        map.set(key, (map.get(key) ?? 0) + t.amount)
      })

    let cumulative = 0
    return Array.from(map.entries()).map(([label, amount]) => {
      cumulative += amount
      return { label, amount: parseFloat(cumulative.toFixed(2)) }
    })
  }, [transfers, period])

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Savings Over Time</h2>
        <div className="flex gap-2">
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-lg transition ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white bg-gray-800'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Saved']}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/SavingsChart.tsx
git commit -m "feat: add SavingsChart component with weekly/monthly toggle"
```

---

## Task 12: Dashboard — Transfer History

**Files:**
- Create: `components/dashboard/TransferHistory.tsx`

- [ ] **Step 1: Write `components/dashboard/TransferHistory.tsx`**

```typescript
'use client'

import { Transfer } from '@/types'
import { useState } from 'react'

interface Props {
  transfers: Transfer[]
}

const PAGE_SIZE = 10

const statusStyles: Record<Transfer['status'], string> = {
  completed: 'bg-green-900 text-green-300',
  pending: 'bg-yellow-900 text-yellow-300',
  failed: 'bg-red-900 text-red-300',
}

export function TransferHistory({ transfers }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(transfers.length / PAGE_SIZE)
  const visible = transfers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Transfer History</h2>

      {transfers.length === 0 ? (
        <p className="text-gray-500 text-sm">No transfers yet. Waiting for your first bet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 pr-4 font-medium">Sportsbook</th>
                  <th className="text-right py-2 pr-4 font-medium">Bet</th>
                  <th className="text-right py-2 pr-4 font-medium">Saved</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 pr-4 text-gray-300">
                      {t.createdAt.toDate().toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{t.merchant}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">
                      ${t.triggerAmount.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right text-white font-medium">
                      ${t.amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[t.status]}`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="disabled:opacity-30 hover:text-white transition"
              >
                ← Previous
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="disabled:opacity-30 hover:text-white transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/TransferHistory.tsx
git commit -m "feat: add paginated TransferHistory component"
```

---

## Task 13: Dashboard Page Assembly

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Write `app/(dashboard)/dashboard/page.tsx`**

```typescript
'use client'

import { useTransfers } from '@/hooks/useTransfers'
import { HeaderStrip } from '@/components/dashboard/HeaderStrip'
import { SavingsChart } from '@/components/dashboard/SavingsChart'
import { SportsbookBreakdown } from '@/components/dashboard/SportsbookBreakdown'
import { TransferHistory } from '@/components/dashboard/TransferHistory'

export default function DashboardPage() {
  const { transfers, loading } = useTransfers()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <HeaderStrip transfers={transfers} />
      <SavingsChart transfers={transfers} />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <SportsbookBreakdown transfers={transfers} />
        </div>
        <div className="col-span-2">
          <TransferHistory transfers={transfers} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/
git commit -m "feat: assemble main dashboard page"
```

---

## Task 14: Settings Page

**Files:**
- Create: `app/api/user/settings/route.ts`
- Create: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Write `app/api/user/settings/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { guardrailPercentage, guardrailActive } = await req.json()
  const update: Record<string, unknown> = {}

  if (typeof guardrailPercentage === 'number') update.guardrailPercentage = guardrailPercentage
  if (typeof guardrailActive === 'boolean') update.guardrailActive = guardrailActive

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await adminDb.doc(`users/${uid}`).update(update)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `app/(dashboard)/settings/page.tsx`**

```typescript
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
    const idToken = await user.getIdToken()
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ guardrailPercentage: percentage, guardrailActive: active }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/user/ app/\(dashboard\)/settings/
git commit -m "feat: add settings page with percentage slider and guardrail toggle"
```

---

## Task 15: Deploy

**Files:** No new files — deploy existing code.

- [ ] **Step 1: Set environment variables in Vercel**

In the Vercel dashboard (or via CLI), add all variables from `.env.local.example` plus `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

```bash
npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# repeat for each variable
```

- [ ] **Step 2: Set environment variables for Cloud Functions**

```bash
cd functions
firebase functions:secrets:set TELLER_SIGNING_SECRET
```

- [ ] **Step 3: Deploy Cloud Functions**

```bash
cd functions
npm run build
firebase deploy --only functions
```

Expected output: `Function URL (tellerWebhook): https://us-central1-{project}.cloudfunctions.net/tellerWebhook`

- [ ] **Step 4: Set Teller webhook URL**

In the Teller dashboard → Webhooks → set the endpoint to the Cloud Function URL from Step 3.

- [ ] **Step 5: Deploy Firestore rules**

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 6: Deploy Next.js to Vercel**

```bash
npx vercel --prod
```

- [ ] **Step 7: Smoke test**

1. Sign up for a new account
2. Complete onboarding (link betting account, link savings account, set percentage)
3. In Teller sandbox, simulate a DraftKings transaction on the linked betting account
4. Verify a new transfer appears on the dashboard
5. Verify the transfer status updates to `completed`

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: GuardRail v1 complete"
```
