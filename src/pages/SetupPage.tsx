import { useState } from 'react';
import { VaultShell } from './VaultShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useVaultStore } from '../stores/vaultStore';
import { Copy, Check, ShieldCheck, KeyRound } from 'lucide-react';

/**
 * First-run setup: choose a passphrase, mint the vault, then show the one-time
 * Recovery Key with an explicit "I've saved it" confirm before entering the app.
 */
export function SetupPage() {
  const setup = useVaultStore((s) => s.setup);
  const pendingRecoveryKey = useVaultStore((s) => s.pendingRecoveryKey);
  const clearPending = useVaultStore((s) => s.clearPendingRecoveryKey);

  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const tooShort = passphrase.length > 0 && passphrase.length < 8;
  const mismatch = confirm.length > 0 && confirm !== passphrase;
  const canSubmit = passphrase.length >= 8 && confirm === passphrase && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await setup(passphrase);
    } catch {
      setError('Could not create your vault. Please try again.');
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!pendingRecoveryKey) return;
    try {
      await navigator.clipboard.writeText(pendingRecoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be unavailable; the key is on screen to copy by hand */
    }
  }

  // Step 2 — recovery key reveal.
  if (pendingRecoveryKey) {
    return (
      <VaultShell>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-ink-700">
            <KeyRound size={18} className="text-teal-500" />
            <h2 className="font-serif text-xl">Your Recovery Key</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-500">
            Write this down and keep it somewhere safe and offline. It's the only way back into your
            cloud backup if you ever forget your passphrase — we can't recover it for you.
          </p>

          <div className="my-4 rounded-card border border-teal-100 bg-teal-50 p-4">
            <div className="text-center font-mono text-lg font-semibold tracking-wide text-teal-700">
              {pendingRecoveryKey}
            </div>
          </div>

          <Button variant="secondary" block onClick={copyKey} className="mb-3">
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Copy key'}
          </Button>

          <label className="mb-4 flex items-start gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="mt-0.5 rounded border-parchment-300 text-teal-500 focus:ring-teal-400"
            />
            <span>I've saved my Recovery Key somewhere safe.</span>
          </label>

          <Button block size="lg" disabled={!saved} onClick={clearPending}>
            Enter Hisaab
          </Button>
        </Card>
      </VaultShell>
    );
  }

  // Step 1 — choose a passphrase.
  return (
    <VaultShell>
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2 text-ink-700">
          <ShieldCheck size={18} className="text-teal-500" />
          <h2 className="font-serif text-xl">Set up your vault</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-ink-500">
          Choose a passphrase to lock your ledger. It encrypts everything before it's backed up —
          only you can read it.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="password"
            label="Passphrase"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            error={tooShort ? 'Use at least 8 characters.' : undefined}
            hint={!tooShort ? 'A memorable phrase beats a short password.' : undefined}
          />
          <Input
            type="password"
            label="Confirm passphrase"
            autoComplete="new-password"
            placeholder="Re-enter it"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Those don't match." : error ?? undefined}
          />
          <Button type="submit" block size="lg" disabled={!canSubmit}>
            {busy ? 'Creating your vault…' : 'Create vault'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 px-2 text-center text-xs leading-relaxed text-ink-300">
        End-to-end encrypted. The server only ever holds sealed, unreadable blobs.
      </p>
    </VaultShell>
  );
}
