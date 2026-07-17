import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { VaultShell } from '../VaultShell';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAccountStore, WrongPasswordError } from '../../stores/accountStore';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

/**
 * Signed-out on this device (status 'signed-out'): the account exists in the
 * cloud but its vault isn't on this device. Sign in with email + password to
 * fetch and unlock it. Reached after signing out, or on a new device.
 */
export function SignInScreen() {
  const cachedEmail = useAccountStore((s) => s.email);
  const signIn = useAccountStore((s) => s.signIn);
  const startOver = useAccountStore((s) => s.startOver);

  const [email, setEmail] = useState(cachedEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const canSubmit = /.+@.+\..+/.test(email) && password.length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'That email or password is incorrect.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.'
      );
      setBusy(false);
    }
  }

  if (forgot) return <ForgotPasswordScreen initialEmail={email} onBack={() => setForgot(false)} />;

  return (
    <VaultShell>
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-ink-700">
          <LogIn size={18} className="text-teal-500" />
          <h2 className="font-serif text-xl">Sign in</h2>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" block size="lg" disabled={!canSubmit}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={() => setForgot(true)} className="font-semibold text-teal-600">
            Forgot password?
          </button>
          <button onClick={() => void startOver()} className="text-ink-500 hover:text-ink-700">
            Create a new account
          </button>
        </div>
      </Card>
    </VaultShell>
  );
}
