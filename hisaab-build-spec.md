# Hisaab — build spec

A local-first, end-to-end encrypted personal spending tracker. Part of the suite
alongside Attend and Harmony, and built to feel like a sibling of both without
being a copy. This document is the source of truth for a Claude Code build. Read
it top to bottom before writing screens; the foundation files listed in
"Already built" are done and should not be regenerated.

---

## 1. What Hisaab is

A PWA that keeps an honest reckoning of where your money goes. You log expenses
and income in a couple of taps, bucket them across accounts and categories, set
goals worth saving for, and see one clear "safe to spend" number that accounts
for the bills still to come. Everything lives on the device first; the cloud copy
is encrypted before it leaves the phone, so the server holds only ciphertext.

Auto-capture of bank SMS/UPI is explicitly **out of scope for v1** and archived
as a future track (email-alert parsing via the Gmail API is the realistic path,
since a PWA cannot read SMS on any OS and bank-linked data needs the regulated
Account Aggregator route). v1 is manual-first, and proud of it.

### Positioning in the suite
- **Attend** signature = sage green. **Harmony** signature = terracotta iris.
- **Hisaab** signature = deep antique **ledger teal** (`--teal-500 #1E7F75`).
- Shared with both: DM Serif Display + Plus Jakarta Sans, warm parchment/ink
  base, warm-tinted shadows, the tappable **sync dot**, silent PWA auto-update,
  and the **changelog-as-version-source** convention.
- Hisaab's own personality: **money is set in the serif display face**
  (big rupee figures read like a hand-kept ledger), tabular figures everywhere,
  and Indian digit grouping (₹1,23,456; lakh/crore in compact labels).

---

## 2. Tech stack

Identical to Attend so the sync engine and shells port cleanly:

- Vite + React 18 + TypeScript
- Tailwind (config already written, teal palette baked in)
- Dexie (IndexedDB) for the local-first store
- Supabase for auth + encrypted-blob backup (Postgres + RLS)
- TanStack Query for server state, Zustand for UI/sync/auth stores
- Framer Motion (`MotionConfig reducedMotion="user"`)
- lucide-react icons, date-fns
- vite-plugin-pwa + workbox-window for installability and auto-update
- **hash-wasm** (Argon2id) — new to this app, for the crypto module
- **recharts** — for the insights charts

---

## 3. Architecture: local-first + true E2E

This is the one place Hisaab diverges hard from Attend/Harmony, which sync
plaintext under RLS. Hisaab's server must never see plaintext.

```
 passphrase ─Argon2id(salt)─▶ KEK ─wraps─▶ DEK ─AES-GCM─▶ record blobs ─▶ cloud
     │                                        │
  never sent                          held in memory (session keyring)
```

- **Local Dexie holds plaintext.** The device is the trust boundary. All queries,
  charts, and aggregations run locally and offline. Fast, private, simple.
- **The DEK** (random AES-GCM-256 key) encrypts every record. It is wrapped by a
  **KEK** derived from the user's passphrase via Argon2id. Only the wrapped DEK +
  salt sit server-side.
- **Sync uploads ciphertext.** Each row is `sealRecord(dek, row)` before it goes
  up; downloads are `openRecord(dek, env)`. The server row stores `{id, iv, ct,
  updated_at, deleted_at}` — opaque blob plus sync metadata. Never plaintext.
- **Recovery.** No server password reset (the server cannot decrypt). On setup we
  also mint a one-time Recovery Key that wraps the same DEK; the user stores it
  offline. `exportVault()/importVault()` produce a fully offline encrypted backup.
- **Trade-offs to accept (state them in the UI):** no server-side search or
  aggregation (all local, which is fine); a lost passphrase + lost recovery key
  means the cloud backup is unreadable (local data on-device is unaffected).

The crypto module (`src/lib/crypto.ts`) is **already built and tested**
(roundtrip + wrong-passphrase rejection verified). Do not rewrite it. Its API:

```ts
createVault(passphrase)         → { wrapped, dek }     // first setup
unlockVault(passphrase, wrapped)→ dek                  // returning / new device
rewrapDek(dek, newSecret)       → wrapped              // change pass / recovery key
generateRecoveryKey()           → "HISB-XXXX-XXXX-…"
sealRecord(dek, record)         → { iv, ct }           // outbound sync
openRecord(dek, env)            → record               // inbound sync
exportVault(wrapped, records)   → VaultBackup          // offline backup
keyring.set/get/isUnlocked/clear                       // in-memory session key
```

### Unlock flow
1. Cold start with an existing account → **Unlock screen** (passphrase → derive
   KEK → unwrap DEK → `keyring.set(dek)` → hydrate).
2. First ever run → **Setup**: choose passphrase, `createVault`, show the
   Recovery Key once with a "I've saved it" confirm, then seed defaults.
3. On sign-out or explicit lock → `keyring.clear()` + `clearLocalDb()`.
4. Optional "trust this device" (v1.1): store the DEK wrapped under a
   non-extractable device key in IndexedDB so cold start skips the passphrase.

---

## 4. Data model

Fully specified in `src/types/index.ts` (already built). Summary:

- **Account** — bank / cash / card / wallet, opening balance, colour, archived.
- **Category** — name, lucide icon, colour, optional `monthly_budget`, order.
- **Transaction** — `type` (expense/income/transfer), positive-paise `amount`,
  account, optional to-account (transfers), category, merchant, note, date,
  `source` (manual/email/recurring), optional `splits[]`.
- **Goal** + **GoalContribution** — target, saved, optional target_date.
- **RecurringRule** — merchant, amount, cadence, next_due, confirmed flag.
- **SyncQueueItem** — table, op (upsert/delete), record_id, retry_count.

Conventions: amounts are **integer paise** (never floats, never negative — sign
is implied by `type`). Every record carries `updated_at / deleted_at / synced_at`
for last-write-wins reconciliation with tombstone deletes. IDs are client-side
uuid v4.

Dexie schema is in `src/lib/db.ts` (already built), including the `[type+date]`
compound index that powers month-range dashboard scans.

---

## 5. The finance brains

In `src/lib/calculations.ts` (already built and sanity-checked). Use these, don't
reinvent:

- `formatINR(paise, showPaise?)` — ₹1,23,456 Indian grouping.
- `formatCompactINR(paise)` — ₹1.2L / ₹34.5k / ₹980 for chart labels.
- `safeToSpend(txns, recurring, goalSetAside)` → the headline number: income −
  spent − bills-still-due − goal set-aside, plus a per-day allowance for the days
  left. **This is the hero of the dashboard.**
- `categoryPace(catId, budget, spent)` → spent-vs-*time* status: `ok / watch /
  over`. 90% spent on day 18 is "watch", not just a bar near full.
- `goalProjection(goal, ratePerMonth)` → progress, run-rate ETA, and if a
  target_date is set: on-track boolean + needed-per-month.
- `detectRecurring(txns)` → candidate subscription/bill rules (same merchant,
  ±8% amount, ~weekly/monthly/yearly spacing, ≥2 occurrences). Cheap heuristic,
  no model. Surface as suggestions the user confirms.
- `categoryBreakdown(txns, start, end)` → sorted slices for the pie/treemap.

Auto-categorisation lives in `src/lib/categories.ts` (already built):
`guessCategory(merchant)` runs deterministic merchant rules first. Once there's
history, override with most-frequent-category-per-merchant (build in v1.1).

---

## 6. Screens

Bottom nav (phone) / side rail (md+), five destinations. Centre is a prominent
teal FAB for "add", exactly like Attend's accent Quick-Mark tab.

`Home · Ledger · [ + ] · Goals · Insights`  (Settings lives in the header/rail.)

### 6.1 Home (Dashboard) — see `mockups/dashboard.html`
- Header: weekday + date kicker, "Hisaab" in serif, "July at a glance".
- **Safe-to-spend hero** (teal gradient card): the number in serif, per-day
  allowance, a thin progress bar of month elapsed, and a four-up split (income /
  spent / bills to come / goals set aside).
- **Goals** card: up to 2–3 goals, each a conic progress ring + name + on-track
  or behind meta + saved/target.
- **Where it went** card: donut (recharts) with legend, current month.
- **Recent** card: last 4–5 transactions, category-tinted icon tiles, income in
  moss with `+`, expense in ink with `−`.

### 6.2 Ledger (transactions)
- Reverse-chronological list grouped by day, sticky day headers with day totals.
- Filter bar (reuse Attend's `ViewFilterBar` pattern): all / account / category /
  type; month switcher.
- Search by merchant/note (local). Tap a row → edit sheet. Swipe → delete
  (confirm, tombstone).

### 6.3 Add / Quick-add (the FAB → BottomSheet)
- Amount pad first (big serif figure as you type), then type toggle
  (expense/income/transfer), account, category (with `guessCategory` pre-selected
  from merchant), merchant, date (defaults today), optional note, optional split.
- "Save & add another" for fast multi-entry. Manual entry is the primary path in
  v1 — make it feel fast and pleasant, not a chore.

### 6.4 Goals
- Grid/list of goal cards with the progress ring and projection line.
- Goal detail: contribution history, add/withdraw contribution, edit target and
  optional date, the projected ETA and needed-per-month if behind.
- "Set aside this month" feeds `goalSetAside` in safe-to-spend.

### 6.5 Insights
- Month / week / day toggle and a trend line (recharts) of spend over time.
- Category breakdown as pie **and** as a ranked bar list with month-over-month
  deltas (▲/▼ vs last period).
- Budget pacing: per-category bars coloured by `categoryPace` status.
- Recurring/subscriptions panel: detected + confirmed rules, next due, monthly
  total committed.

### 6.6 Accounts (under Settings or its own rail item)
- Consolidated net balance across accounts + per-account balances (opening
  balance + running txn sum). Add/edit/archive accounts. Cash vs digital split.

### 6.7 Settings
- Vault: change passphrase (`rewrapDek`), view/regenerate Recovery Key, export
  encrypted backup, lock now.
- Categories: reorder, edit, set monthly budgets, restore defaults.
- Data: CSV export (local), import.
- Account: Supabase sign-in/out.
- **Version + changelog** (reuse the family pattern): current `APP_VERSION` and
  the release list, opened from the sync dot modal and Settings.

---

## 7. Components to port from the suite

Lift these near-verbatim from Attend (swap sage→teal where they reference accent
colour); they already match the design language:

- `layout/AppShell`, `SideNav`, `BottomNav`, `PageHeader`, `navItems`
- `ui/SyncIndicator` (SyncDot), `ui/UpdateOverlay`, `ui/Modal`, `ui/BottomSheet`,
  `ui/Fab`, `ui/Button`, `ui/Input`, `ui/DateInput`, `ui/Badge`, `ui/Skeleton`,
  `ui/ProgressRing` (reused for goals)
- `lib/motion`, `lib/sync` (extend to seal/open blobs), `lib/supabase`,
  `lib/queryClient`, `lib/export`, `stores/syncStore`, `stores/authStore`,
  `stores/uiStore`, `hooks/useSyncQueue`, `hooks/useNetwork`, `hooks/useRealtime`,
  `hooks/useViewport`

New to Hisaab: `ui/AmountPad`, `ui/GoalRing` (conic), `ui/CategoryPie`
(recharts), `ui/TrendChart`, `ui/SafeToSpendCard`, `ui/PaceBar`,
`ui/TxnRow`, `ui/AccountChip`, and the vault screens
(`pages/UnlockPage`, `pages/SetupPage`).

**Design guardrail:** it must not read as a re-skinned Attend. The differentiators
are the serif money figures, the teal-gradient safe-to-spend hero, the ledger-day
grouping, and the finance-specific components. Keep the warm restraint of the
family; add Hisaab's own centre of gravity.

---

## 8. Sync engine changes vs Attend

Attend's `syncEngine` pushes/pulls plaintext rows. For Hisaab:

1. On **push**: pull dirty rows from `sync_queue`, `sealRecord(keyring.get(),
   row)` each, upsert `{id, table, iv, ct, updated_at, deleted_at}` to Supabase.
2. On **pull**: fetch rows changed since last cursor, `openRecord` each with the
   DEK, write plaintext into Dexie (respecting last-write-wins on `updated_at`).
3. Guard every sync path with `keyring.isUnlocked()`; if locked, queue and wait.
4. The wrapped DEK + salt live in a `vault_keys` row keyed by user id (RLS: owner
   only). Fetch on new device to enable unlock.
5. Supabase tables store only ciphertext columns; there are **no** plaintext
   amount/merchant/category columns server-side. Realtime just signals "something
   changed", the client decrypts.

---

## 9. PWA + update behaviour

Copy Attend's `main.tsx` service-worker handling verbatim (focus/visibility
re-check, graceful `controllerchange` reload, the `hisaab:updating` overlay
event). Copy the iOS-safe height model from `index.css` (already ported). App
name "Hisaab", teal theme-color, maskable icons.

---

## 10. Milestones

1. **Shell + vault** — port AppShell/nav/sync dot; Setup + Unlock screens;
   seed default categories + a Cash account; changelog/version wired.
2. **Ledger core** — Add sheet with amount pad + `guessCategory`; transactions
   list with day grouping; edit/delete; accounts + balances.
3. **Dashboard** — safe-to-spend hero; recent; goals summary; category donut.
4. **Goals** — full goal CRUD, contributions, projection.
5. **Insights** — trend chart, breakdown with MoM deltas, budget pacing,
   recurring detection + confirm flow.
6. **Encrypted sync** — seal/open in the sync engine; vault_keys; multi-device
   unlock; encrypted export/import; CSV export.
7. **Polish** — reduced-motion, empty states, skeletons, a11y, PWA icons.

Future (archived): email-alert auto-capture via Gmail API; Account Aggregator
integration (needs a regulated/TSP path); Splitwise-style shared settle-up.

---

## 11. Already built (do not regenerate)

- `tailwind.config.js` — teal palette on the family base
- `src/index.css` — iOS-safe shell, teal focus ring, tabular money
- `src/types/index.ts` — full data model
- `src/lib/db.ts` — Dexie schema
- `src/lib/crypto.ts` — E2E module (tested)
- `src/lib/categories.ts` — palette, seed categories, merchant rules
- `src/lib/calculations.ts` — INR format, safe-to-spend, pacing, projection,
  recurring detection, breakdown
- `src/lib/changelog.ts` — v0.1.0 seed + APP_VERSION
- `mockups/dashboard.html` — the visual reference for Home
