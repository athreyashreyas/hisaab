# Deploying Hisaab

Hisaab works with **zero backend** — it's local-first and installs as a PWA. The
steps below add the optional, end-to-end-encrypted cloud backup (Supabase) and
host the app on Vercel with auto-deploy on every push to `main`.

The server never sees plaintext. It stores only ciphertext blobs and the
*wrapped* vault key (useless without your passphrase), scoped per-user by RLS.

---

## 1. Supabase (encrypted backup)

1. Create a project at <https://supabase.com/dashboard> (free tier is plenty).
2. Apply the schema — either:
   - **Dashboard:** SQL Editor → paste `supabase/migrations/0001_init.sql` → Run, or
   - **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
3. Grab **Project URL** and **anon public key** from
   Project Settings → API.
4. *(Optional, smoother sign-up for iteration)* Authentication → Providers →
   Email → turn **off** "Confirm email" so new accounts work without a
   verification click. Leave it on for a real launch.

The schema creates two owner-only tables: `vault_keys` and `records`. That's all
the backup needs.

## 2. Vercel (hosting + CI)

1. <https://vercel.com/new> → **Import** the `hisaab` GitHub repo.
2. Framework preset auto-detects **Vite**. Build settings come from `vercel.json`
   (build `npm run build`, output `dist`, SPA rewrites for client-side routes).
3. Add two **Environment Variables** (Production + Preview):
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon public key
4. Deploy. Every push to `main` ships automatically; pull requests get preview
   URLs.

To deploy from the CLI instead: `npm i -g vercel && vercel && vercel --prod`.

## 3. Verify the round-trip

1. Open the deployed URL, complete **Setup** (passphrase + save the Recovery Key).
2. Settings → **Sign in for encrypted backup** → create an account.
3. Add a transaction. The sync dot should settle to "All changes backed up".
4. In Supabase → Table Editor → `records`, confirm rows exist and every `ct`
   column is unreadable ciphertext (no merchant names, no amounts). That's the
   whole promise, visible.

## Local development

```bash
cp .env.example .env.local   # optional — only for testing cloud sync locally
npm install
npm run dev
```

Without `.env.local`, the app runs local-only and the sync dot reads
"On this device only".
