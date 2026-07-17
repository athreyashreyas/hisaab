import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Wallet, Shapes, KeyRound, Download, Upload, FileText,
  Lock, LogOut, LogIn, RefreshCw, Info, BookOpen,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { useVaultStore } from '../stores/vaultStore';
import { useAuthStore } from '../stores/authStore';
import { isCloudConfigured } from '../lib/supabase';
import { APP_VERSION } from '../lib/changelog';
import {
  exportTransactionsCsv,
  exportEncryptedVault,
  importEncryptedVault,
} from '../lib/export';

export function SettingsPage() {
  const navigate = useNavigate();
  const lock = useVaultStore((s) => s.lock);
  const { user, signOut } = useAuthStore();

  const [changePass, setChangePass] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const regenerate = useVaultStore((s) => s.regenerateRecoveryKey);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const n = await importEncryptedVault(file);
      flash(`Restored ${n} record${n === 1 ? '' : 's'}.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div>
      <PageHeader kicker="Preferences" title="Settings" />

      <SettingsGroup title="Your money">
        <Row icon={<Wallet size={18} />} label="Accounts" onClick={() => navigate('/settings/accounts')} chevron />
        <Row icon={<Shapes size={18} />} label="Categories & budgets" onClick={() => navigate('/settings/categories')} chevron />
      </SettingsGroup>

      <SettingsGroup title="Vault & security">
        <Row icon={<KeyRound size={18} />} label="Change passphrase" onClick={() => setChangePass(true)} chevron />
        <Row
          icon={<RefreshCw size={18} />}
          label="Regenerate Recovery Key"
          onClick={async () => setRecoveryKey(await regenerate())}
          chevron
        />
        <Row icon={<Lock size={18} />} label="Lock now" onClick={lock} />
      </SettingsGroup>

      <SettingsGroup title="Data">
        <Row icon={<FileText size={18} />} label="Export as CSV" onClick={() => void exportTransactionsCsv()} />
        <Row
          icon={<Download size={18} />}
          label="Export encrypted backup"
          onClick={async () => {
            await exportEncryptedVault();
            flash('Encrypted backup downloaded.');
          }}
        />
        <Row icon={<Upload size={18} />} label="Import encrypted backup" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
      </SettingsGroup>

      <SettingsGroup title="Account">
        {isCloudConfigured() ? (
          user ? (
            <>
              <Row icon={<Icon name="cloud" size={18} />} label={user.email ?? 'Signed in'} sub="Encrypted backup on" />
              <Row icon={<LogOut size={18} />} label="Sign out" onClick={() => void signOut()} />
            </>
          ) : (
            <Row icon={<LogIn size={18} />} label="Sign in for encrypted backup" onClick={() => setSignIn(true)} chevron />
          )
        ) : (
          <Row icon={<Icon name="cloud-off" size={18} />} label="Cloud backup not configured" sub="Hisaab is running on this device only" />
        )}
      </SettingsGroup>

      <SettingsGroup title="About">
        <Row icon={<BookOpen size={18} />} label="How Hisaab works" onClick={() => navigate('/guide?pane=guide')} chevron />
        <Row icon={<Info size={18} />} label="What's new" sub={`v${APP_VERSION}`} onClick={() => navigate('/guide?pane=new')} chevron />
      </SettingsGroup>

      <p className="mt-6 px-2 text-center text-xs leading-relaxed text-ink-300">
        Hisaab keeps your ledger on this device and backs it up end-to-end encrypted.
        We can't read it, and we can't reset your passphrase — keep your Recovery Key safe.
      </p>

      <ChangePassphraseModal open={changePass} onClose={() => setChangePass(false)} onDone={() => flash('Passphrase changed.')} />
      <RecoveryKeyModal recoveryKey={recoveryKey} onClose={() => setRecoveryKey(null)} />
      <SignInModal open={signIn} onClose={() => setSignIn(false)} />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[60] mx-auto w-fit rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-parchment-50 shadow-lg md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-300">{title}</div>
      <Card className="divide-y divide-parchment-200 overflow-hidden">{children}</Card>
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  onClick,
  chevron,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-parchment-100">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-teal-50 text-teal-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium text-ink-900">{label}</span>
        {sub && <span className="block truncate text-[12px] text-ink-500">{sub}</span>}
      </span>
      {chevron && <ChevronRight size={17} className="shrink-0 text-ink-300" />}
    </Tag>
  );
}

function ChangePassphraseModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const change = useVaultStore((s) => s.changePassphrase);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSave = current && next.length >= 8 && next === confirm && !busy;

  async function submit() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      await change(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone();
      onClose();
    } catch {
      setError('Current passphrase is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change passphrase">
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-ink-500">
          Your data isn't re-encrypted — only the key wrapping changes, so this is instant.
        </p>
        <Input type="password" label="Current passphrase" value={current} onChange={(e) => setCurrent(e.target.value)} error={error ?? undefined} />
        <Input type="password" label="New passphrase" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters." />
        <Input
          type="password"
          label="Confirm new passphrase"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm && confirm !== next ? "Those don't match." : undefined}
        />
        <Button block disabled={!canSave} onClick={submit}>
          {busy ? 'Updating…' : 'Change passphrase'}
        </Button>
      </div>
    </Modal>
  );
}

function RecoveryKeyModal({ recoveryKey, onClose }: { recoveryKey: string | null; onClose: () => void }) {
  return (
    <Modal open={recoveryKey !== null} onClose={onClose} title="New Recovery Key">
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-ink-500">
          Your old Recovery Key no longer works. Store this new one somewhere safe and offline.
        </p>
        <div className="rounded-card border border-teal-100 bg-teal-50 p-4 text-center font-mono text-lg font-semibold tracking-wide text-teal-700">
          {recoveryKey}
        </div>
        <Button block onClick={onClose}>I've saved it</Button>
      </div>
    </Modal>
  );
}

function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithEmail, signUpWithEmail } = useAuthStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'in' ? 'Sign in' : 'Create account'}>
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-ink-500">
          Signing in only enables the encrypted backup. Your passphrase still decrypts your data — the
          server can't read it.
        </p>
        <Input type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} error={error ?? undefined} />
        <Button block disabled={busy || !email || !password} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </Button>
        <button
          onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
          className="w-full text-center text-sm font-semibold text-teal-600"
        >
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </Modal>
  );
}
