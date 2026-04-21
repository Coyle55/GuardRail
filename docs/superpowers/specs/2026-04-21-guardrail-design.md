# GuardRail — Design Spec
**Date:** 2026-04-21

## Overview

GuardRail is a financial dashboard for sports bettors. Every time a user places a bet, GuardRail automatically moves a user-defined percentage of that bet amount into their savings account. The user sets the percentage once; everything else is automatic.

Example: 20% guardrail + $5 bet → $1 automatically transferred to savings.

GuardRail does not affiliate with or connect directly to sportsbooks. It monitors the user's debit card account via Teller.io, detects transactions from known sportsbook merchants, and initiates ACH transfers to the user's savings account.

---

## Stack

- **Frontend:** Next.js + Tailwind CSS, deployed to Vercel
- **Auth:** Firebase Authentication (email/password)
- **Database:** Firebase Firestore
- **Backend:** Firebase Cloud Functions
- **Bank connectivity:** Teller.io (transaction monitoring + ACH transfers)
- **Charts:** Recharts

---

## Architecture

```
[User's Browser]
      ↓
[Next.js App — Vercel]
      ↓                    ↓
[Firebase Auth]     [Firebase Firestore]
                          ↑
              [Firebase Cloud Functions]
                    ↑              ↓
              [Teller.io]    [Teller.io]
          (watch betting     (initiate ACH
            account)         to savings)
```

Teller.io monitors the user's betting debit account and fires a webhook to a Cloud Function on every new transaction. The Cloud Function checks the merchant name against a known sportsbook list. On a match, it calculates the guardrail amount, initiates an ACH transfer to the savings account via Teller, and writes the result to Firestore. The Next.js dashboard reads from Firestore in real time.

---

## Data Model (Firestore)

### `users/{userId}`
| Field | Type | Description |
|---|---|---|
| `email` | string | User email |
| `displayName` | string | User display name |
| `guardrailPercentage` | number | e.g., 20 (for 20%) |
| `guardrailActive` | boolean | Pause/resume the guardrail |
| `tellerBettingAccountId` | string | Teller ID for the betting debit account |
| `tellerSavingsAccountId` | string | Teller ID for the savings account |
| `createdAt` | timestamp | Account creation time |

### `users/{userId}/transfers/{transferId}`
| Field | Type | Description |
|---|---|---|
| `amount` | number | Dollars moved to savings |
| `triggerAmount` | number | Original bet amount detected |
| `merchant` | string | e.g., "DraftKings" |
| `status` | string | `pending` \| `completed` \| `failed` |
| `tellerTransactionId` | string | Teller ID of the incoming bet transaction (used for deduplication) |
| `tellerTransferId` | string | Teller ID of the outgoing ACH transfer (for reconciliation) |
| `fee` | number \| null | GuardRail fee (null in v1, populated in v2) |
| `createdAt` | timestamp | Transfer initiation time |

---

## User Onboarding Flow

1. Sign up with email/password (Firebase Auth)
2. Connect betting debit account (Teller.io widget)
3. Connect savings account (Teller.io widget)
4. Set guardrail percentage (slider, 1–50%)
5. Land on dashboard — guardrail is live

After step 5, Teller monitors the betting account automatically. The user only returns to the app to review their dashboard or adjust settings.

---

## Sportsbook Detection

The Cloud Function maintains a hardcoded constant array of known sportsbook merchant name strings (e.g., DraftKings, FanDuel, BetMGM, PointsBet, Caesars, ESPN Bet). Incoming Teller transaction counterparty names are matched against this list via case-insensitive substring match. Non-matching transactions are silently ignored. In v2 this list can be moved to a Firestore config document for runtime updates without redeployment.

---

## Cloud Function Logic (Webhook Handler)

1. Receive Teller webhook
2. Verify webhook signature
3. Check `tellerTransactionId` against Firestore — skip if already processed (deduplication)
4. Match transaction merchant against sportsbook list — skip if no match
5. Check `guardrailActive` — skip if paused
6. Calculate transfer amount: `triggerAmount × (guardrailPercentage / 100)`
7. Initiate ACH transfer via Teller from betting account → savings account
8. Write transfer document to Firestore with `status: pending`
9. On Teller confirmation webhook: update `status` to `completed` or `failed`

---

## Dashboard UI

### Header Strip
- Total saved all-time
- Total saved this month
- Number of bets detected

### Savings Chart
- Recharts line/bar chart — cumulative savings over time
- Weekly/monthly toggle

### Sportsbook Breakdown
- Per-merchant totals (e.g., DraftKings: $42, FanDuel: $18)

### Transfer History
- Paginated list: date, merchant, bet amount, amount saved, status

### Settings Panel
- Guardrail percentage slider (1–50%)
- Pause/resume toggle
- Linked accounts summary (betting account, savings account)

### Navigation
- Minimal sidebar or top nav: Dashboard + Settings

---

## Edge Case Handling

| Scenario | Behavior |
|---|---|
| Transfer fails (Teller error) | Logged as `status: failed`, surfaced on dashboard |
| Duplicate webhook from Teller | Deduplicated via `tellerTransferId` check before initiating transfer |
| Unknown merchant | Silently ignored, no transfer initiated |
| Guardrail paused | Webhook received but no transfer initiated |
| Insufficient funds | Teller returns error → logged as `failed` |

---

## v2 Planned Features (not in v1)

- **Monetization:** GuardRail takes a small fee per transfer. Fee is split from the transfer amount — a portion goes to a GuardRail business bank account via a second Teller transfer. The `fee` field in the `transfers` schema is reserved for this.
- **Email notifications:** SendGrid or Firebase Extensions for per-transfer email receipts.
- **Push/SMS notifications:** Extend notification layer on top of in-app.
