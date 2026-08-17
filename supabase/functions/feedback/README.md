# feedback

The relay behind **Settings → Make Hisaab Yours**. The app composes a message,
this function hands it to [Resend](https://resend.com), and it arrives in your
inbox with the sender's registered Hisaab address set as the mail's
**reply-to**, so replying in your mail client writes back to them.

Until it is deployed, the app still works: a send that cannot reach the relay is
kept in the device's feedback outbox and retried on the next connection.

## One-time setup

1. **Resend key.** The suite (Attend, Harmony, Hisaab, Nila) shares one Resend
   account — the one owned by `athreya.shreyas@gmail.com` — because the default
   sender `onboarding@resend.dev` may only deliver to the address that owns the
   account, and that is the only address these functions send to. Create a
   **separate API key per app** in that account (Resend → API Keys → Create),
   named for the app, so one app's key can be rotated or revoked without taking
   the other three down.

2. **Link the project**, if this machine has not already:

   ```sh
   npx supabase login
   npx supabase link --project-ref <hisaab-project-ref>
   ```

3. **Set the secrets:**

   ```sh
   npx supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   npx supabase secrets set FEEDBACK_TO=athreya.shreyas@gmail.com
   ```

   `FEEDBACK_TO` and `FEEDBACK_FROM` are both optional; the defaults in
   `index.ts` are the same values.

4. **Deploy:**

   ```sh
   npx supabase functions deploy feedback
   ```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the platform. JWT
verification is left on (the default), so only a signed-in user can call it.

## Checking it

Sign in to the app, open Settings → Make Hisaab Yours, and send a line. Logs are
under Edge Functions → feedback → Logs in the Supabase dashboard.

## Replying

Just hit Reply. The mail carries `reply_to: <their Hisaab address>`, so the
answer goes to them from your own inbox and needs nothing else set up.

Sending the reply *through* Resend instead would need a domain you own, verified
in Resend, because the shared `onboarding@resend.dev` sender can only deliver to
your own address. Worth doing if replies should come from something like
`hello@hisaab.app`, but it is not needed for replies to reach anyone today.

## What does not travel

Hisaab's ledger is end-to-end encrypted and stays that way. This function
carries only what the sender typed plus the footer the app appends: app version,
device kind, local time, and their own account address. No amounts, account
names or categories are ever put into a message by the app.
