import { Landmark, TrendingUp, CircleSlash } from 'lucide-react';
import { Money } from '../ui/Money';
import type { Account, ID, Investment } from '../../types';
import { cn } from '../../lib/cn';

/**
 * Where a goal's money comes from: a cash account, or a holding.
 *
 * Both are money you already have, and either can back a goal — "the trip fund
 * sits in my savings account", "the house fund is in my flexi-cap". Keeping them
 * in one control, under one question, is what makes that choice legible; before
 * this, goals could only draw from accounts and the portfolio sat in a separate
 * screen with no stated relationship to anything.
 *
 * `null` means the money isn't attributed to a source, so no balance and no
 * holding moves — offered only where it makes sense (an old contribution that
 * predates the choice, or money from outside Hisaab entirely).
 */
export type FundingSource =
  | { kind: 'account'; id: ID }
  | { kind: 'investment'; id: ID }
  | null;

export function sourceOf(accountId: ID | null, investmentId: ID | null): FundingSource {
  if (accountId) return { kind: 'account', id: accountId };
  if (investmentId) return { kind: 'investment', id: investmentId };
  return null;
}

/** Split a source back into the two nullable columns the records carry. */
export function sourceColumns(source: FundingSource): {
  account_id: ID | null;
  investment_id: ID | null;
} {
  return {
    account_id: source?.kind === 'account' ? source.id : null,
    investment_id: source?.kind === 'investment' ? source.id : null,
  };
}

export function SourcePicker({
  accounts,
  investments,
  value,
  onChange,
  label = 'Money comes from',
  allowNone = false,
  /** Balances/values by id, shown under each chip so the choice is informed. */
  amounts,
  hint,
}: {
  accounts: Account[];
  investments: Investment[];
  value: FundingSource;
  onChange: (source: FundingSource) => void;
  label?: string | null;
  allowNone?: boolean;
  amounts?: Map<ID, number>;
  hint?: string;
}) {
  const empty = accounts.length === 0 && investments.length === 0;

  return (
    <div>
      {label && <div className="mb-1.5 text-sm font-semibold text-ink-700">{label}</div>}

      {empty ? (
        <p className="text-[13px] text-ink-500">
          Add an account or an investment first, and you can point this goal at it.
        </p>
      ) : (
        <div className="space-y-2.5">
          {accounts.length > 0 && (
            <SourceGroup
              icon={<Landmark size={12} />}
              title="Accounts"
              items={accounts}
              kind="account"
              value={value}
              onChange={onChange}
              amounts={amounts}
            />
          )}
          {investments.length > 0 && (
            <SourceGroup
              icon={<TrendingUp size={12} />}
              title="Investments"
              items={investments}
              kind="investment"
              value={value}
              onChange={onChange}
              amounts={amounts}
            />
          )}
          {allowNone && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                value === null
                  ? 'border-ink-500 bg-parchment-200 text-ink-700'
                  : 'border-parchment-300 bg-parchment-50 text-ink-500'
              )}
            >
              <CircleSlash size={13} /> Don't track a source
            </button>
          )}
        </div>
      )}

      {hint && <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>}
    </div>
  );
}

function SourceGroup({
  icon,
  title,
  items,
  kind,
  value,
  onChange,
  amounts,
}: {
  icon: React.ReactNode;
  title: string;
  items: (Account | Investment)[];
  kind: 'account' | 'investment';
  value: FundingSource;
  onChange: (source: FundingSource) => void;
  amounts?: Map<ID, number>;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-500">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = value?.kind === kind && value.id === item.id;
          const amount = amounts?.get(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ kind, id: item.id })}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active
                  ? 'border-transparent text-white'
                  : 'border-parchment-300 bg-parchment-50 text-ink-700'
              )}
              style={active ? { backgroundColor: item.color } : undefined}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : item.color }}
              />
              <span className="max-w-[11rem] truncate">{item.name}</span>
              {amount !== undefined && (
                <Money
                  paise={amount}
                  className={cn('text-[11.5px]', active ? 'opacity-80' : 'text-ink-500')}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
