# Nav Redesign + Visual Polish

**Date:** 2026-04-24  
**Status:** Approved

## Summary

Replace the current split nav (desktop sidebar + mobile bottom tab bar) with a single unified top header bar across all screen sizes. Fix three visual defects spotted in the mobile browser view.

## Header Design

A sticky full-width top bar replaces both `gr-sidebar` and `gr-bottom-nav`.

**Layout:**
- Left: shield icon + "GuardRail" wordmark (same as current sidebar brand block)
- Right: avatar circle — first initial of `user.displayName`, accent background (`--gr-accent`), dark text
- Click/tap avatar → dropdown menu appears below it with two items: "Settings" (links to `/settings`) and "Sign out" (calls `logOut()` then pushes to `/login`)
- Dropdown dismisses on outside click or on item selection

**Styling:**
- Background: `var(--gr-surface)`, border-bottom: `1px solid var(--gr-border)`
- Height: `56px` on mobile, `60px` on desktop
- Sticky (`position: sticky; top: 0; z-index: 100`)
- Dropdown: `var(--gr-card)` background, `var(--gr-border-md)` border, `8px` border-radius, subtle shadow

## Layout Changes

- `gr-dashboard-layout` changes from column (mobile) / row (desktop) to always column — header on top, main content below
- `gr-sidebar` CSS class removed entirely
- `gr-bottom-nav` CSS class removed entirely
- `gr-main-content` bottom padding reduced from `84px` to `24px` on mobile (no longer needs to clear the bottom nav)
- Desktop content padding unchanged (`36px 40px`)

## Files Changed

- `app/(dashboard)/nav.tsx` — full rewrite to header + avatar dropdown
- `app/globals.css` — remove sidebar/bottom-nav rules, add header rules, fix mobile content padding
- `app/(dashboard)/layout.tsx` — no changes needed (just renders `<Nav />` and `<main>`)

## Visual Defect Fixes

1. **Transfer amount color on non-completed transfers** — in `TransferHistory`, the `+$X.XX` amount is currently always green. Change: green only when `status === 'completed'`, `var(--gr-text-3)` otherwise.
2. **2-digit year in transfer dates** — the date formatter produces `Apr 24, 26`. Fix: use `{ year: 'numeric' }` instead of `{ year: '2-digit' }` in the date format options.
3. **Mobile bottom padding** — covered under Layout Changes above.

## Out of Scope

- No changes to Settings page layout
- No changes to Onboarding or Auth pages
- No changes to data fetching or Firebase logic
