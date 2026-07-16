# Hisaab — Claude Code kickoff

Paste this into Claude Code from the repo root to start the build.

---

You are building **Hisaab**, a local-first, end-to-end encrypted personal
spending tracker PWA. It is part of a suite with **Attend** and **Harmony** and
must feel like their sibling without being a copy.

**Read `hisaab-build-spec.md` in full before writing any code.** It is the source
of truth. Then:

1. **Do not regenerate** the files listed under "Already built" in the spec
   (tokens, crypto, db, types, calculations, categories, changelog, mockup).
   Read them and build on their APIs.

2. **Reference implementations to mirror:** clone or read the sibling repos for
   the shell, sync engine, and UI primitives, then adapt (accent sage → teal):
   - Attend: `github.com/athreyashreyas/attendance-tracker` (closest structural
     match — single Vite app, same stack)
   - Harmony: `github.com/athreyashreyas/harmony` (token/theme patterns)

3. **Scaffold** the Vite + React + TS project (`index.html`, `vite.config.ts`
   with PWA plugin, `postcss.config.js`, `tsconfig.json`, `main.tsx`, `App.tsx`,
   `router.tsx`) using `package.json` as given.

4. **Build in the milestone order** from spec §10. Ship each milestone working
   and typechecking (`npm run typecheck`) before the next.

5. **Non-negotiables:**
   - Server sees only ciphertext. Every synced row goes through
     `sealRecord`/`openRecord`. No plaintext amount/merchant columns in Supabase.
   - Money is rendered in DM Serif Display with `formatINR` (Indian grouping).
   - Amounts are integer paise end to end.
   - Reuse the family's sync dot, update overlay, and changelog-as-version.
   - Guard sync with `keyring.isUnlocked()`.

6. **Design bar:** warm parchment restraint of the family, but Hisaab's own
   centre of gravity — the teal safe-to-spend hero, serif rupee figures, ledger
   day-grouping. Match `mockups/dashboard.html` for Home. It should be beautiful
   and unmistakably its own app.

Start by reading the spec and the two sibling repos, then confirm the plan and
begin milestone 1 (shell + vault).
