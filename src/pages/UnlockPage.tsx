import { useState } from 'react';
import { VaultShell } from './VaultShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useVaultStore } from '../stores/vaultStore';
import { WrongPassphraseError } from '../lib/crypto';
import { Lock } from 'lucide-react';

/** Returning-user unlock: passphrase → derive KEK → unwrap DEK → hydrate. */
export function UnlockPage() {
  const unlock = useVaultStore((s) => s.unlock);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(passphrase);
    } catch (err) {
      setError(
        err instanceof WrongPassphraseError
          ? 'That passphrase does not match this vault.'
          : 'Something went wrong unlocking. Try again.'
      );
      setBusy(false);
    }
  }

  return (
    <VaultShell>
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-ink-700">
          <Lock size={18} className="text-teal-500" />
          <h2 className="font-serif text-xl">Unlock your ledger</h2>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="password"
            label="Passphrase"
            autoFocus
            autoComplete="current-password"
            placeholder="Enter your passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" block size="lg" disabled={!passphrase || busy}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 px-2 text-center text-xs leading-relaxed text-ink-300">
        Your passphrase never leaves this device. It derives the key that decrypts your ledger, and
        we can't reset it, so keep your Recovery Key safe.
      </p>
    </VaultShell>
  );
}
