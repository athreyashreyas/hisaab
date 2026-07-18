import { Icon } from '../ui/Icon';
import { Money } from '../ui/Money';
import { ArrowLeftRight } from 'lucide-react';
import type { Account, Category, Transaction } from '../../types';
import { denominationColor } from '../../lib/denominations';
import { cn } from '../../lib/cn';

/**
 * One ledger line: a slim banknote stripe down the left edge (the note that
 * would cover the amount), a category-tinted icon tile, merchant + context, and
 * the amount. Income shows in moss with a leading +, expense in ink with −,
 * transfers in cerulean. Used in the ledger list and the Home "Recent" card.
 */
export function TxnRow({
  txn,
  category,
  account,
  toAccount,
  onClick,
  className,
}: {
  txn: Transaction;
  category?: Category;
  account?: Account;
  toAccount?: Account;
  onClick?: () => void;
  className?: string;
}) {
  const isIncome = txn.type === 'income';
  const isTransfer = txn.type === 'transfer';

  const tint = isTransfer ? '#3E7CA1' : isIncome ? '#6E9B61' : category?.color ?? '#6B6960';
  const iconName = isTransfer ? undefined : isIncome ? 'briefcase' : category?.icon ?? 'circle-dashed';

  const context = isTransfer
    ? `${account?.name ?? '-'} → ${toAccount?.name ?? '-'}`
    : `${isIncome ? 'Income' : category?.name ?? 'Uncategorised'} · ${account?.name ?? '-'}`;

  const title = txn.merchant || (isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense');

  // The banknote that would cover this amount — the row's edge stripe.
  const noteColor = denominationColor(txn.amount);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-3 py-3 pl-5 pr-4 text-left transition-colors hover:bg-parchment-100',
        className
      )}
    >
      {/* Banknote stripe: which note this spend is, at a glance down the list. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-1.5 w-1 rounded-full"
        style={{ backgroundColor: noteColor }}
      />
      <span
        className="grid shrink-0 place-items-center rounded-[10px]"
        style={{ backgroundColor: `${tint}20`, color: tint, height: 38, width: 38 }}
      >
        {isTransfer ? <ArrowLeftRight size={17} /> : <Icon name={iconName!} size={17} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink-900">{title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">{context}</span>
      </span>

      <Money
        paise={txn.amount}
        sign={isIncome ? '+' : isTransfer ? null : '-'}
        className={cn('text-[15px] font-semibold', isIncome ? 'text-moss-600' : 'text-ink-900')}
        style={isTransfer ? { color: '#3E7CA1' } : undefined}
      />
    </button>
  );
}
