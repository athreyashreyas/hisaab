import { useState } from 'react';
import { Lock } from 'lucide-react';
import { VaultShell } from '../VaultShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAccountStore, WrongPassphraseError } from '../../stores/accountStore';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

/**
 * Same-device unlock (status 'locked'): the email is known, so just the password
 * is needed. Works fully offline — the password unwraps the local vault. A live
 * session is re-established quietly in the background for backup.
 */
export function UnlockScreen() {
  const email = useAccountStore((s) => s.email);
  const unlock = useAccountStore((s) => s.unlock);
  const useDifferentAccount = useAccountStore((s) => s.useDifferentAccount);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(
        err instanceof WrongPassphraseError
          ? 'That password is incorrect.'
          : 'Something went wrong. Try again.'
      );
      setBusy(false);
    }
  }

  if (forgot) return <ForgotPasswordScreen initialEmail={email ?? ''} onBack={() => setForgot(false)} />;

  return (
    <VaultShell>
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2 text-ink-700">
          <Lock size={18} className="text-teal-500" />
          <h2 className="font-serif text-xl">Welcome back</h2>
        </div>
        {email && <p className="mb-4 text-sm text-ink-500">{email}</p>}
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="password"
            label="Password"
            autoFocus
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" block size="lg" disabled={!password || busy}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={() => setForgot(true)} className="font-semibold text-teal-600">
            Forgot password?
          </button>
          <button onClick={() => void useDifferentAccount()} className="text-ink-500 hover:text-ink-700">
            Use a different account
          </button>
        </div>
      </Card>
      <p className="mt-4 px-2 text-center text-xs leading-relaxed text-ink-300">
        Your password unlocks your ledger on this device, offline. It never leaves your phone in a
        form the server can read.
      </p>
    </VaultShell>
  );
}
