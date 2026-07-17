import { useState } from 'react';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { VaultShell } from '../VaultShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAccountStore, WrongRecoveryPhraseError } from '../../stores/accountStore';

/**
 * Shown after arriving from a password-reset email (status 'recovery'). Setting a
 * new password requires the recovery phrase, because the phrase is what unlocks
 * the encrypted data to re-wrap it under the new password. Without it, the data
 * can't be read — so we offer an explicit, well-warned "start over".
 */
export function ResetPasswordScreen() {
  const resetViaRecovery = useAccountStore((s) => s.resetViaRecovery);
  const startOver = useAccountStore((s) => s.startOver);
  const email = useAccountStore((s) => s.user?.email ?? s.email);

  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noPhrase, setNoPhrase] = useState(false);

  const canSubmit =
    phrase.trim().split(/\s+/).filter(Boolean).length >= 6 &&
    password.length >= 8 &&
    confirm === password &&
    !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await resetViaRecovery(password, phrase);
    } catch (err) {
      setError(
        err instanceof WrongRecoveryPhraseError
          ? 'That recovery phrase does not match this account.'
          : err instanceof Error
            ? err.message
            : 'Could not reset your password. Try again.'
      );
      setBusy(false);
    }
  }

  if (noPhrase) {
    return (
      <VaultShell>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2 text-rose-600">
            <AlertTriangle size={18} />
            <h2 className="font-serif text-xl">Start over without your phrase</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-500">
            Without your recovery phrase, your existing ledger cannot be decrypted, by us or by you.
            Starting over creates a fresh, empty vault. Your old encrypted backup stays sealed and
            unreadable.
          </p>
          <div className="mt-5 space-y-2">
            <Button variant="danger" block onClick={() => void startOver()}>
              Start over with an empty vault
            </Button>
            <Button variant="ghost" block onClick={() => setNoPhrase(false)}>
              Go back
            </Button>
          </div>
        </Card>
      </VaultShell>
    );
  }

  return (
    <VaultShell>
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2 text-ink-700">
          <KeyRound size={18} className="text-teal-500" />
          <h2 className="font-serif text-xl">Set a new password</h2>
        </div>
        {email && <p className="mb-4 text-sm text-ink-500">{email}</p>}
        <form onSubmit={submit} className="space-y-4">
          <Textarea
            label="Recovery phrase"
            rows={2}
            placeholder="The twelve words you saved"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <Input
            type="password"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter it"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm && confirm !== password ? "Those don't match." : error ?? undefined}
          />
          <Button type="submit" block size="lg" disabled={!canSubmit}>
            {busy ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
        <button
          onClick={() => setNoPhrase(true)}
          className="mt-4 w-full text-center text-sm text-ink-500 hover:text-ink-700"
        >
          I don't have my recovery phrase
        </button>
      </Card>
    </VaultShell>
  );
}
