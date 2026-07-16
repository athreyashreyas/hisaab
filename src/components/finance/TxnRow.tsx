import { Icon } from '../ui/Icon';
import { Money } from '../ui/Money';
import { ArrowLeftRight } from 'lucide-react';
import type { Account, Category, Transaction } from '../../types';
import { cn } from '../../lib/cn';

/**
 * One ledger line: a category-tinted icon tile, merchant + context, and the
 * amount. Income shows in moss with a leading +, expense in ink with −, transfers
 * in cerulean. Used in the ledger list and the Home "Recent" card.
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
    ? `${account?.name ?? '—'} → ${toAccount?.name ?? '—'}`
    : `${isIncome ? 'Income' : category?.name ?? 'Uncategorised'} · ${account?.name ?? '—'}`;

  const title = txn.merchant || (isTransfer ? 'Transfer' : isIncome ? 'Income' : 'Expense');

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-parchment-100',
        className
      )}
    >
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
