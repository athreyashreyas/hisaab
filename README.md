# Hisaab

An honest reckoning of where your money goes. Local-first, end-to-end encrypted,
and quietly backed up. Part of the suite with Attend and Harmony.

Log any expense or income in a couple of taps, bucket it across accounts and
categories, set goals worth saving for, and read one clear **safe to spend**
number that already accounts for the bills still to come.

## Principles

- **On your device first.** Everything works offline. Charts and totals are
  instant because they run against a local store, not a server.
- **Truly end to end.** Your ledger is encrypted with a key derived from a
  passphrase only you know. The cloud copy is sealed before it leaves your phone;
  the server holds ciphertext and timestamps, nothing readable.
- **Manual, and proud of it (for now).** Bank SMS/UPI auto-capture is archived
  for a future release — a PWA can't read SMS on any OS, and bank-linked data
  needs the regulated Account Aggregator route. v1 makes manual entry fast and
  pleasant. Email-alert auto-capture is the planned next step.

## Stack

Vite · React · TypeScript · Tailwind · Dexie (IndexedDB) · Supabase (encrypted
backup) · TanStack Query · Zustand · Framer Motion · recharts · hash-wasm
(Argon2id) · WebCrypto (AES-GCM).

## Getting started

```bash
npm install
npm run dev
```

## Building it

- `hisaab-build-spec.md` — the full spec (architecture, E2E design, data model,
  screens, milestones).
- `claude-code-kickoff.md` — the prompt to hand the build to Claude Code.
- `mockups/dashboard.html` — the visual reference for the Home screen.

The design language is shared with Attend and Harmony: DM Serif Display + Plus
Jakarta Sans on warm parchment. Hisaab's signature is a deep ledger teal, with
money set in the serif face so it reads like a hand-kept account book.

## Encryption at a glance

```
passphrase ─Argon2id─▶ KEK ─wraps─▶ DEK ─AES-GCM─▶ record blobs ─▶ cloud
```

The DEK encrypts every record and never leaves the device unwrapped. Changing
your passphrase re-wraps the DEK without re-encrypting your data. A one-time
Recovery Key (and an offline encrypted export) protects against a forgotten
passphrase. See `src/lib/crypto.ts`.
