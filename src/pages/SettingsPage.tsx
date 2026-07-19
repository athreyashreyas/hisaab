import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Wallet, Shapes, KeyRound, Download, Upload, FileText,
  Lock, LogOut, RefreshCw, Info, BookOpen, Copy, Check,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { useAccountStore } from '../stores/accountStore';
import { isCloudConfigured } from '../lib/supabase';
import { APP_VERSION } from '../lib/changelog';
import { useTheme } from '../lib/theme';
import { THEMES } from '../lib/themes';
import { cn } from '../lib/cn';
import {
  exportTransactionsCsv,
  exportEncryptedVault,
  importEncryptedVault,
} from '../lib/export';

export function SettingsPage() {
  const navigate = useNavigate();
  const lock = useAccountStore((s) => s.lock);
  const signOut = useAccountStore((s) => s.signOut);
  const regenerate = useAccountStore((s) => s.regenerateRecoveryPhrase);
  const email = useAccountStore((s) => s.email);
  const user = useAccountStore((s) => s.user);

  const [changePass, setChangePass] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

      <ThemeSection />

      <SettingsGroup title="Security">
        <Row icon={<KeyRound size={18} />} label="Change password" onClick={() => setChangePass(true)} chevron />
        <Row
          icon={<RefreshCw size={18} />}
          label="New recovery phrase"
          sub="Replaces your old one"
          onClick={async () => setRecoveryPhrase(await regenerate())}
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
        <Row
          icon={<Icon name={isCloudConfigured() ? 'cloud' : 'cloud-off'} size={18} />}
          label={email ?? 'This device'}
          sub={
            isCloudConfigured()
              ? user
                ? 'Encrypted backup on'
                : 'Backup resumes when you reconnect'
              : 'On this device only'
          }
        />
        {isCloudConfigured() && (
          <Row icon={<LogOut size={18} />} label="Sign out" onClick={() => void signOut()} />
        )}
      </SettingsGroup>

      <SettingsGroup title="About">
        <Row icon={<BookOpen size={18} />} label="How Hisaab works" onClick={() => navigate('/guide?pane=guide')} chevron />
        <Row icon={<Info size={18} />} label="What's new" sub={`v${APP_VERSION}`} onClick={() => navigate('/guide?pane=new')} chevron />
      </SettingsGroup>

      <p className="mt-6 px-2 text-center text-xs leading-relaxed text-ink-300">
        Hisaab keeps your ledger on this device and backs it up end-to-end encrypted.
        We can't read it, and we can't reset your password, so keep your recovery phrase safe.
      </p>

      <ChangePasswordModal open={changePass} onClose={() => setChangePass(false)} onDone={() => flash('Password changed.')} />
      <RecoveryPhraseModal phrase={recoveryPhrase} onClose={() => setRecoveryPhrase(null)} />

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[60] mx-auto w-fit rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-parchment-50 shadow-lg md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Theme picker: a grid of banknote-inspired swatches. Selecting one re-skins
 *  the whole app instantly (per device) via the token layer. */
function ThemeSection() {
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <div className="mt-5">
      <div className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-300">
        Appearance
      </div>
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.id === themeId;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-card border p-2.5 text-left transition-colors',
                  active ? 'border-teal-400 bg-teal-50' : 'border-parchment-300 hover:bg-parchment-100'
                )}
                aria-pressed={active}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ring-black/5"
                  style={{ backgroundColor: t.bg }}
                >
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: t.accent }} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-ink-900">
                    <span>{t.name}</span>
                    {active && <Check size={13} className="shrink-0 text-teal-600" />}
                  </span>
                  {t.note && <span className="mt-0.5 block text-[11px] text-ink-500">{t.note}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
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

function ChangePasswordModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const change = useAccountStore((s) => s.changePassword);
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
    } catch (err) {
      setError(err instanceof Error && err.name === 'WrongPassphraseError' ? 'Current password is incorrect.' : 'Current password is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-ink-500">
          Your data isn't re-encrypted. Only the key wrapping changes, so this is instant. Your
          recovery phrase stays the same.
        </p>
        <Input type="password" label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={error ?? undefined} />
        <Input type="password" label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters." />
        <Input
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm && confirm !== next ? "Those don't match." : undefined}
        />
        <Button block disabled={!canSave} onClick={submit}>
          {busy ? 'Updating…' : 'Change password'}
        </Button>
      </div>
    </Modal>
  );
}

function RecoveryPhraseModal({ phrase, onClose }: { phrase: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const words = (phrase ?? '').split(' ').filter(Boolean);

  async function copy() {
    if (!phrase) return;
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* on screen to copy by hand */
    }
  }

  return (
    <Modal open={phrase !== null} onClose={onClose} title="New recovery phrase">
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-ink-500">
          Your old recovery phrase no longer works. Write these twelve words down and keep them
          somewhere safe and offline.
        </p>
        <div className="rounded-card border border-teal-100 bg-teal-50 p-4">
          <ol className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {words.map((w, i) => (
              <li key={i} className="flex items-baseline gap-2 font-mono text-sm text-teal-800">
                <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-teal-400">{i + 1}</span>
                <span className="font-semibold">{w}</span>
              </li>
            ))}
          </ol>
        </div>
        <Button variant="secondary" block onClick={copy}>
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? 'Copied' : 'Copy phrase'}
        </Button>
        <Button block onClick={onClose}>I've saved it</Button>
      </div>
    </Modal>
  );
}
