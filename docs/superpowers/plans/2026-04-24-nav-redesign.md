# Nav Redesign + Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split sidebar/bottom-tab-bar nav with a single sticky top header (logo left, avatar dropdown right) and fix three visual defects in TransferHistory.

**Architecture:** The header replaces both `gr-sidebar` (desktop) and `gr-bottom-nav` (mobile) with a single `gr-header` component that renders at all screen sizes. The dashboard layout becomes a simple column: header on top, scrollable content below. Avatar click opens/closes a dropdown managed with local `useState` + an `useEffect` outside-click listener.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, inline styles + CSS classes in `app/globals.css`, Firebase Auth (`useAuth` hook)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `app/(dashboard)/nav.tsx` | Rewrite | New header + avatar dropdown, remove sidebar and bottom nav |
| `app/globals.css` | Modify | Remove sidebar/bottom-nav rules, add header rules, fix mobile content padding |
| `components/dashboard/TransferHistory.tsx` | Modify | Fix amount color and date year format |

---

### Task 1: Fix TransferHistory visual defects

**Files:**
- Modify: `components/dashboard/TransferHistory.tsx`

- [ ] **Step 1: Fix the amount color**

In `components/dashboard/TransferHistory.tsx`, the mobile card amount (line 116) is hardcoded to `var(--gr-accent)`. Change it to grey for non-completed transfers:

```tsx
// Mobile card amount — was: color: 'var(--gr-accent)'
<div style={{
  fontFamily: 'var(--font-dm-mono, monospace)',
  fontSize: '15px', fontWeight: 500,
  color: t.status === 'completed' ? 'var(--gr-accent)' : 'var(--gr-text-3)',
}}>
  +${t.amount.toFixed(2)}
</div>
```

- [ ] **Step 2: Fix the date year format — mobile**

Line 109 uses `year: '2-digit'` which produces "26" instead of "2026". Change both occurrences (mobile + desktop table):

```tsx
// Mobile (line ~109)
{t.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
```

- [ ] **Step 3: Fix the date year format — desktop table**

```tsx
// Desktop table (line ~150)
{t.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
```

- [ ] **Step 4: Verify visually**

Start the dev server (`npm run dev`), open `http://localhost:3000/dashboard`. Confirm:
- Transfer amounts for non-completed rows show in grey (`#415770`), not green
- Dates show `Apr 24, 2026` not `Apr 24, 26`

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/TransferHistory.tsx
git commit -m "fix: transfer amount color and date year format"
```

---

### Task 2: Rewrite nav.tsx as top header

**Files:**
- Rewrite: `app/(dashboard)/nav.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/firebase/auth'

function ShieldMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 1.5L3 4.5v4.5c0 3.728 2.632 7.214 6 8.076C12.368 16.214 15 12.728 15 9V4.5L9 1.5z" fill="#06080C" />
      <path d="M6 9.25l2.2 2.25 3.8-4.5" stroke="#06080C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /path/to/project && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/nav.tsx
git commit -m "feat: replace sidebar/bottom-nav with top header and avatar dropdown"
```

---

### Task 3: Update globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the layout section in globals.css**

Find the block starting with `/* ── Responsive layout ── */` (around line 209) and ending after the bottom-nav-item rules (around line 288). Replace the entire block with:

```css
/* ── Responsive layout ── */
.gr-dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--gr-bg);
}

.gr-main-content {
  flex: 1;
  padding: 24px 16px;
  overflow-y: auto;
  min-width: 0;
}
@media (min-width: 768px) {
  .gr-main-content { padding: 36px 40px; }
}

/* ── Top header ── */
.gr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: var(--gr-surface);
  border-bottom: 1px solid var(--gr-border);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
@media (min-width: 768px) {
  .gr-header {
    height: 60px;
    padding: 0 32px;
  }
}

.gr-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.gr-header-shield {
  width: 32px;
  height: 32px;
  background: var(--gr-accent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 16px var(--gr-accent-glow);
}

.gr-header-wordmark {
  font-family: var(--font-syne);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: var(--gr-text);
}

/* ── Avatar ── */
.gr-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--gr-accent);
  color: #06080C;
  font-family: var(--font-syne);
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.gr-avatar:hover {
  opacity: 0.88;
  box-shadow: 0 0 14px var(--gr-accent-glow);
}

/* ── Dropdown ── */
.gr-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: var(--gr-card);
  border: 1px solid var(--gr-border-md);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 200;
  animation: fadeIn 0.12s ease both;
}

.gr-dropdown-item {
  display: block;
  width: 100%;
  padding: 11px 16px;
  font-size: 14px;
  color: var(--gr-text-2);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.gr-dropdown-item:hover {
  background: var(--gr-hover);
  color: var(--gr-text);
}
.gr-dropdown-item--button {
  border-top: 1px solid var(--gr-border);
}
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` on desktop and mobile viewport (DevTools → iPhone). Confirm:
- Top header shows with GuardRail logo left, green avatar circle right
- Clicking avatar opens dropdown with Settings and Sign out
- Clicking outside closes the dropdown
- Settings link navigates to `/settings`
- Sign out works
- No bottom bar visible anywhere
- Desktop no longer shows sidebar

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add header/avatar/dropdown CSS, remove sidebar and bottom-nav"
```

---

### Task 4: Deploy to Vercel

- [ ] **Step 1: Push branch**

```bash
git push origin feature/guardrail-v1
```

Vercel will auto-deploy the preview URL. Verify the production build works at the preview URL on a real mobile device.
