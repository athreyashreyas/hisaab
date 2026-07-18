import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { DateInput } from '../components/ui/DateInput';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { Segmented, AccountPicker } from '../components/add/Pickers';
import { useInvestments, useAccounts, portfolioSummary } from '../hooks/useData';
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  midnight,
} from '../lib/repo';
import { ACCENT_PALETTE } from '../lib/categories';
import type { Investment, InvestmentKind } from '../types';
import { cn } from '../lib/cn';

const KIND_META: Record<InvestmentKind, { label: string; plural: string; icon: string }> = {
  stock: { label: 'Stock', plural: 'Stocks', icon: 'trending-up' },
  mutual_fund: { label: 'Mutual fund', plural: 'Mutual funds', icon: 'layers' },
  fd: { label: 'Fixed deposit', plural: 'Fixed deposits', icon: 'piggy-bank' },
  other: { label: 'Other', plural: 'Other', icon: 'coins' },
};

const KIND_ORDER: InvestmentKind[] = ['stock', 'mutual_fund', 'fd', 'other'];

function pctLabel(fraction: number): string {
  const p = fraction * 100;
  const sign = p > 0 ? '+' : p < 0 ? '' : '';
  return `${sign}${p.toFixed(1)}%`;
}

/** The portfolio: stocks, mutual funds, FDs, and anything else, with returns. */
export function InvestmentsPage() {
  const holdings = useInvestments();
  const [editing, setEditing] = useState<Investment | null | 'new'>(null);

  const sum = portfolioSummary(holdings);
  const up = sum.gain >= 0;

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: holdings.filter((h) => h.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        kicker="Portfolio"
        title="Investments"
        trailing={
          <Button size="sm" onClick={() => setEditing('new')} className="px-3">
            <Plus size={16} /> Add
          </Button>
        }
      />

      {holdings.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon="trending-up"
            title="Track what you're growing"
            body="Add your stocks, mutual funds, and fixed deposits. Update the value now and then, and Hisaab shows what each one has earned."
            action={<Button onClick={() => setEditing('new')}>Add an investment</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="mt-3 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 p-5 text-[#F3FBF9]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-80">
              Current value
            </div>
            <Money paise={sum.current} className="mt-1 text-[38px] leading-none" />
            <div className="mt-3 flex items-center gap-4 text-[12px] opacity-90">
              <div>
                Invested
                <Money paise={sum.invested} className="mt-0.5 block text-[15px] font-semibold" />
              </div>
              <div>
                Returns
                <span className="mt-0.5 flex items-center gap-1 text-[15px] font-semibold">
                  {up ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  <Money paise={Math.abs(sum.gain)} />
                  <span className="opacity-80">({pctLabel(sum.returnPct)})</span>
                </span>
              </div>
            </div>
          </Card>

          {grouped.map(({ kind, items }) => (
            <div key={kind}>
              <SectionHeader title={KIND_META[kind].plural} />
              <div className="space-y-2">
                {items.map((h) => (
                  <HoldingRow key={h.id} holding={h} onClick={() => setEditing(h)} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <InvestmentModal target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function HoldingRow({ holding, onClick }: { holding: Investment; onClick: () => void }) {
  const gain = holding.current_value - holding.invested;
  const pct = holding.invested > 0 ? gain / holding.invested : 0;
  const up = gain >= 0;

  const sub =
    holding.kind === 'fd'
      ? [
          holding.interest_rate != null ? `${holding.interest_rate}% p.a.` : null,
          holding.maturity_date ? `matures ${format(holding.maturity_date, 'd MMM yyyy')}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : `updated ${format(holding.valued_at, 'd MMM')}`;

  return (
    <Card
      as="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-parchment-100"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-card"
        style={{ backgroundColor: `${holding.color}22`, color: holding.color }}
      >
        <Icon name={KIND_META[holding.kind].icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink-900">{holding.name}</div>
        <div className="mt-0.5 truncate text-[12px] tabular-nums text-ink-500">
          <Money paise={holding.invested} /> <span className="text-ink-300">→</span>{' '}
          <Money paise={holding.current_value} />
          {sub && <span className="text-ink-300"> · {sub}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Money
          paise={Math.abs(gain)}
          sign={up ? '+' : '-'}
          className={cn('block text-[14px] font-semibold', up ? 'text-moss-600' : 'text-rose-600')}
        />
        <span className={cn('text-[11.5px] tabular-nums', up ? 'text-moss-600' : 'text-rose-600')}>
          {pctLabel(pct)}
        </span>
      </div>
    </Card>
  );
}

function InvestmentModal({
  target,
  onClose,
}: {
  target: Investment | null | 'new';
  onClose: () => void;
}) {
  const accounts = useAccounts();
  const open = target !== null;
  const existing = target !== 'new' && target !== null ? target : null;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<InvestmentKind>('stock');
  const [invested, setInvested] = useState('');
  const [current, setCurrent] = useState('');
  const [rate, setRate] = useState('');
  const [hasMaturity, setHasMaturity] = useState(false);
  const [maturity, setMaturity] = useState(() => midnight());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [color, setColor] = useState(ACCENT_PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setKind(existing.kind);
      setInvested(String(Math.round(existing.invested / 100)));
      setCurrent(String(Math.round(existing.current_value / 100)));
      setRate(existing.interest_rate != null ? String(existing.interest_rate) : '');
      setHasMaturity(existing.maturity_date != null);
      setMaturity(existing.maturity_date ?? midnight());
      setAccountId(existing.account_id);
      setNote(existing.note);
      setColor(existing.color);
    } else {
      setName('');
      setKind('stock');
      setInvested('');
      setCurrent('');
      setRate('');
      setHasMaturity(false);
      setMaturity(midnight());
      setAccountId(null);
      setNote('');
      setColor(ACCENT_PALETTE[0]);
    }
  }, [open, existing]);

  const investedPaise = Math.round(Number(invested || '0') * 100);
  // Current value defaults to the invested amount when left blank (a fresh buy).
  const currentPaise = current.trim() ? Math.round(Number(current) * 100) : investedPaise;
  const canSave = name.trim().length > 0 && investedPaise > 0;

  async function save() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      kind,
      invested: investedPaise,
      current_value: currentPaise,
      interest_rate: kind === 'fd' && rate.trim() ? Number(rate) : null,
      maturity_date: kind === 'fd' && hasMaturity ? maturity : null,
      account_id: accountId,
      note: note.trim(),
      color,
    };
    if (existing) await updateInvestment(existing.id, payload);
    else await createInvestment(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit investment' : 'New investment'}>
      <div className="space-y-4 px-5 py-4">
        <Input
          label="Name"
          placeholder="Reliance, Parag Parikh Flexi Cap, HDFC FD…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <div className="mb-1.5 text-sm font-semibold text-ink-700">Type</div>
          <Segmented
            options={[
              { value: 'stock', label: 'Stock' },
              { value: 'mutual_fund', label: 'MF' },
              { value: 'fd', label: 'FD' },
              { value: 'other', label: 'Other' },
            ]}
            value={kind}
            onChange={(v) => setKind(v as InvestmentKind)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount invested"
            inputMode="numeric"
            placeholder="50000"
            value={invested}
            onChange={(e) => setInvested(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <Input
            label="Current value"
            inputMode="numeric"
            placeholder="Same as invested"
            value={current}
            onChange={(e) => setCurrent(e.target.value.replace(/[^0-9]/g, ''))}
            hint="Update this over time."
          />
        </div>

        {kind === 'fd' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Interest rate"
              inputMode="decimal"
              placeholder="7.1"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))}
              hint="% per year"
            />
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                <input
                  type="checkbox"
                  checked={hasMaturity}
                  onChange={(e) => setHasMaturity(e.target.checked)}
                  className="rounded border-parchment-300 text-teal-500 focus:ring-teal-400"
                />
                Maturity
              </label>
              {hasMaturity && (
                <div className="mt-2">
                  <DateInput value={maturity} onChange={setMaturity} />
                </div>
              )}
            </div>
          </div>
        )}

        {accounts.length > 0 && (
          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            label="Funded from (optional)"
          />
        )}

        <Input label="Note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />

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
          {existing && (
            <Button
              variant="ghost"
              onClick={() => {
                void deleteInvestment(existing.id);
                onClose();
              }}
              className="px-3 text-rose-600"
            >
              Delete
            </Button>
          )}
          <Button onClick={save} disabled={!canSave} className="flex-1">
            {existing ? 'Save changes' : 'Add investment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
