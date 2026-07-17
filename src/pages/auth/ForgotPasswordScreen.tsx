import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { VaultShell } from '../VaultShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAccountStore } from '../../stores/accountStore';
import { isCloudConfigured } from '../../lib/supabase';

/**
 * Request a password-reset email. The link in the email brings the user back
 * into the app in a recovery session, where ResetPasswordScreen sets a new
 * password using the recovery phrase. This screen only sends the email.
 */
export function ForgotPasswordScreen({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const requestPasswordReset = useAccountStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <VaultShell>
      <Card className="p-5">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-500">
              <MailCheck size={22} />
            </div>
            <h2 className="font-serif text-xl text-ink-900">Check your email</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              If an account exists for {email}, we sent a reset link. Open it on this device, then
              set a new password with your recovery phrase.
            </p>
            <Button variant="secondary" block className="mt-5" onClick={onBack}>
              Back
            </Button>
          </div>
        ) : (
          <>
            <h2 className="mb-1 font-serif text-xl text-ink-900">Reset your password</h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-500">
              {isCloudConfigured()
                ? 'We will email you a link. You will set a new password with your recovery phrase, which keeps your data readable.'
                : 'Password reset needs cloud backup, which is not set up on this build.'}
            </p>
            <form onSubmit={submit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error ?? undefined}
              />
              <Button type="submit" block disabled={busy || !isCloudConfigured() || !/.+@.+\..+/.test(email)}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
            <button onClick={onBack} className="mt-4 w-full text-center text-sm font-semibold text-teal-600">
              Back
            </button>
          </>
        )}
      </Card>
    </VaultShell>
  );
}
