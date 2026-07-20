import { useState, useEffect } from 'react';
import { Plus, Wallet, Landmark, CreditCard, Smartphone, Archive } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { Segmented } from '../components/add/Pickers';
import { useAccountBalances, useGoalsReserved } from '../hooks/useData';
import { groupIndianDecimal, paiseToInput, rupeesToPaise, sanitiseDecimalInput } from '../lib/calculations';
import { createAccount, updateAccount, archiveAccount } from '../lib/repo';
import { ACCENT_PALETTE } from '../lib/categories';
import type { Account, AccountKind } from '../types';
import { cn } from '../lib/cn';

const KIND_ICON: Record<AccountKind, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  wallet: Smartphone,
};

/** Net worth across accounts + per-account balances, with a cash/digital split. */
export function AccountsPage() {
  // Raw money actually in each account (goal set-asides shown split out, not
  // silently subtracted). See the hero card below for the corpus breakdown.
  const balances = useAccountBalances(false);
  const reserved = useGoalsReserved();
  const [editing, setEditing] = useState<Account | null | 'new'>(null);

  const active = balances.filter((b) => !b.account.archived);
  const archived = balances.filter((b) => b.account.archived);

  const inAccounts = active.reduce((s, b) => s + b.balance, 0);
  const freeCorpus = inAccounts - reserved;
  const cash = active.filter((b) => b.account.kind === 'cash').reduce((s, b) => s + b.balance, 0);
  const digital = inAccounts - cash;

  return (
    <div>
      <PageHeader
        kicker="Balances"
        title="Accounts"
        back
        trailing={
          <Button size="sm" onClick={() => setEditing('new')} className="px-3">
            <Plus size={16} /> Add
          </Button>
        }
      />

      <Card className="mt-3 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 p-5 text-[color:var(--on-primary)]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-80">
          {reserved > 0 ? 'Free corpus' : 'Net balance'}
        </div>
        <Money paise={freeCorpus} className="mt-1 text-[38px] leading-none" />

        {reserved > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/15 pt-3 text-[12px] tabular-nums opacity-90">
            <span>
              In accounts <Money paise={inAccounts} className="font-semibold" />
            </span>
            <span className="opacity-70">−</span>
            <span>
              Set aside for goals <Money paise={reserved} className="font-semibold" />
            </span>
          </div>
        )}

        <div className="mt-3 flex gap-6 text-[12px] opacity-90">
          <div>
            Cash<Money paise={cash} className="mt-0.5 block text-[15px] font-semibold" />
          </div>
          <div>
            Digital<Money paise={digital} className="mt-0.5 block text-[15px] font-semibold" />
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        {active.map(({ account, balance }) => {
          const KIcon = KIND_ICON[account.kind];
          return (
            <Card
              key={account.id}
              as="button"
              onClick={() => setEditing(account)}
              className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-parchment-100"
            >
              <span className="grid h-10 w-10 place-items-center rounded-card" style={{ backgroundColor: `${account.color}22`, color: account.color }}>
                <KIcon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink-900">{account.name}</div>
                <div className="text-[12px] capitalize text-ink-500">{account.kind}</div>
              </div>
              <Money
                paise={balance}
                sign={balance < 0 ? '-' : null}
                className={cn('font-semibold', balance < 0 ? 'text-rose-600' : 'text-ink-900')}
              />
            </Card>
          );
        })}
      </div>

      {archived.length > 0 && (
        <>
          <SectionHeader title="Archived" />
          <div className="space-y-2">
            {archived.map(({ account, balance }) => (
              <Card key={account.id} className="flex items-center gap-3 p-3.5 opacity-70">
                <span className="grid h-10 w-10 place-items-center rounded-card bg-parchment-200 text-ink-500">
                  <Archive size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-700">{account.name}</div>
                </div>
                <Money paise={balance} className="text-ink-500" />
                <Button size="sm" variant="ghost" onClick={() => archiveAccount(account.id, false)}>
                  Restore
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      <AccountModal
        target={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function AccountModal({ target, onClose }: { target: Account | null | 'new'; onClose: () => void }) {
  const open = target !== null;
  const existing = target !== 'new' && target !== null ? target : null;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('bank');
  const [opening, setOpening] = useState('');
  const [color, setColor] = useState(ACCENT_PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setKind(existing.kind);
      setOpening(paiseToInput(existing.opening_balance));
      setColor(existing.color);
    } else {
      setName('');
      setKind('bank');
      setOpening('');
      setColor(ACCENT_PALETTE[0]);
    }
  }, [open, existing]);

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    const opening_balance = rupeesToPaise(opening || '0');
    if (existing) await updateAccount(existing.id, { name: name.trim(), kind, opening_balance, color });
    else await createAccount({ name: name.trim(), kind, opening_balance, color });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit account' : 'New account'}>
      <div className="space-y-4 px-5 py-4">
        <Input label="Name" placeholder="HDFC Salary, Cash…" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Type</div>
          <Segmented
            options={[
              { value: 'bank', label: 'Bank' },
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'wallet', label: 'Wallet' },
            ]}
            value={kind}
            onChange={(v) => setKind(v as AccountKind)}
          />
        </div>
        <Input
          label="Opening balance"
          inputMode="decimal"
          placeholder="0.00"
          value={groupIndianDecimal(opening)}
          onChange={(e) => setOpening(sanitiseDecimalInput(e.target.value, true))}
          hint="What's in this account right now. Paise are fine, e.g. 1,240.50."
        />
        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Colour</div>
          <div className="flex gap-2">
            {ACCENT_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('h-8 w-8 rounded-full', color === c && 'ring-2 ring-offset-2 ring-offset-parchment-100')}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {existing && !existing.archived && (
            <Button
              variant="ghost"
              onClick={() => {
                void archiveAccount(existing.id, true);
                onClose();
              }}
              className="text-ink-500"
            >
              Archive
            </Button>
          )}
          <Button onClick={save} disabled={!canSave} className="flex-1">
            {existing ? 'Save changes' : 'Add account'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
