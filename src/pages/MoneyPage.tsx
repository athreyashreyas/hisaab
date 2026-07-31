import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, Landmark, CreditCard, Smartphone, Target, TrendingUp, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Money } from '../components/ui/Money';
import { EmptyState } from '../components/ui/EmptyState';
import { GoalRow } from '../components/finance/GoalRow';
import { formatShort } from '../lib/money';
import {
  useAccountBalances,
  useGoals,
  useAllContributions,
  useInvestments,
  useNetWorth,
} from '../hooks/useData';
import { goalPace, groupContributions } from '../lib/goals';
import { portfolioSummary } from '../lib/portfolio';
import type { AccountKind } from '../types';
import { cn } from '../lib/cn';

const KIND_ICON: Record<AccountKind, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  card: CreditCard,
  wallet: Smartphone,
};

/**
 * Money: one screen for everything you have and what it's promised to.
 *
 * Accounts, goals and investments used to live on three unconnected screens, so
 * the obvious questions — what am I worth, how much of it is already spoken for,
 * which pot is this goal actually coming out of — had no home. This is that home,
 * and the bottom bar is a tab shorter for it. The arithmetic is stated in full at
 * the top rather than implied: what you hold, minus what goals have claimed, is
 * what's free.
 */
export function MoneyPage() {
  const navigate = useNavigate();
  const balances = useAccountBalances();
  const goals = useGoals();
  const contributions = useAllContributions();
  const holdings = useInvestments();
  const net = useNetWorth();

  const byGoal = groupContributions(contributions);
  const active = balances.filter((b) => !b.account.archived);
  const portfolio = portfolioSummary(holdings);
  const paced = goals.map((goal) => ({ goal, pace: goalPace(goal, byGoal.get(goal.id) ?? []) }));
  const dueThisMonth = paced.reduce((s, p) => s + p.pace.dueThisMonth, 0);

  const nothingYet = active.length === 0 && goals.length === 0 && holdings.length === 0;

  return (
    <div>
      <PageHeader kicker="Everything you have" title="Money" />

      <Card className="mt-3 overflow-hidden bg-gradient-to-br from-teal-600 to-teal-500 p-5 text-[color:var(--on-primary)]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-80">
          What you hold
        </div>
        <Money paise={net.total} className="mt-1 text-[38px] leading-none" />

        <div className="mt-3.5 flex gap-6 text-[12px] opacity-90">
          <div>
            In accounts
            <Money paise={net.inAccounts} className="mt-0.5 block text-[15px] font-semibold" />
          </div>
          <div>
            In investments
            <Money paise={net.inInvestments} className="mt-0.5 block text-[15px] font-semibold" />
          </div>
        </div>

        {net.reserved > 0 && (
          <div className="mt-3.5 border-t border-white/15 pt-3 text-[12px] tabular-nums">
            <div className="flex items-center justify-between opacity-90">
              <span className="flex items-center gap-1.5">
                <Target size={13} /> Set aside for goals
              </span>
              <span className="font-semibold">
                −<Money paise={net.reserved} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-80">
                Free to use
              </span>
              <Money paise={net.free} className="text-[19px] font-semibold" />
            </div>
          </div>
        )}
      </Card>

      {nothingYet && (
        <Card className="mt-4">
          <EmptyState
            icon="wallet"
            title="Nothing here yet"
            body="Add the accounts you keep money in, and Hisaab starts drawing the picture: what you hold, what's promised to a goal, and what's genuinely free."
            action={<Button onClick={() => navigate('/settings/accounts')}>Add an account</Button>}
          />
        </Card>
      )}

      {active.length > 0 && (
        <>
          <SectionHeader
            title="Accounts"
            subtle
            action={
              <button
                onClick={() => navigate('/settings/accounts')}
                className="text-xs font-semibold text-teal-600"
              >
                Manage →
              </button>
            }
          />
          <Card className="divide-y divide-parchment-200 overflow-hidden">
            {active.map(({ account, balance }) => {
              const KIcon = KIND_ICON[account.kind];
              return (
                <button
                  key={account.id}
                  onClick={() => navigate('/settings/accounts')}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-parchment-100"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-card"
                    style={{ backgroundColor: `${account.color}22`, color: account.color }}
                  >
                    <KIcon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink-900">
                      {account.name}
                    </div>
                    <div className="text-[11.5px] capitalize text-ink-500">{account.kind}</div>
                  </div>
                  <Money
                    paise={balance}
                    sign={balance < 0 ? '-' : null}
                    className={cn('font-semibold', balance < 0 ? 'text-rose-600' : 'text-ink-900')}
                  />
                </button>
              );
            })}
          </Card>
        </>
      )}

      <SectionHeader
        title={
          dueThisMonth > 0 ? (
            <span>
              Goals{' '}
              <span className="font-normal normal-case tracking-normal text-ink-500">
                · {formatShort(dueThisMonth)} to add this month
              </span>
            </span>
          ) : (
            'Goals'
          )
        }
        subtle
        action={
          <button onClick={() => navigate('/goals')} className="text-xs font-semibold text-teal-600">
            All goals →
          </button>
        }
      />
      {goals.length === 0 ? (
        <Card
          as="button"
          onClick={() => navigate('/goals')}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-parchment-100"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-teal-50 text-teal-600">
            <Target size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink-900">
              Set something worth saving for
            </span>
            <span className="block text-[12px] text-ink-500">
              Goals hold money out of the free figure above, from an account or a holding.
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-250" />
        </Card>
      ) : (
        <Card className="divide-y divide-parchment-200 overflow-hidden">
          {paced.slice(0, 4).map(({ goal, pace }) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              pace={pace}
              onClick={() => navigate(`/goals/${goal.id}`)}
            />
          ))}
        </Card>
      )}

      <SectionHeader
        title="Investments"
        subtle
        action={
          <button onClick={() => navigate('/invest')} className="text-xs font-semibold text-teal-600">
            Portfolio →
          </button>
        }
      />
      {holdings.length === 0 ? (
        <Card
          as="button"
          onClick={() => navigate('/invest')}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-parchment-100"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-teal-50 text-teal-600">
            <TrendingUp size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink-900">
              Track what you&rsquo;re growing
            </span>
            <span className="block text-[12px] text-ink-500">
              Stocks, funds and deposits count toward what you hold, and can fund a goal.
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-250" />
        </Card>
      ) : (
        <Card
          as="button"
          onClick={() => navigate('/invest')}
          className="flex w-full items-center gap-4 p-4 text-left hover:bg-parchment-100"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">
              Current value
            </div>
            <Money paise={portfolio.current} className="mt-0.5 block text-[22px] text-ink-900" />
            <div className="mt-0.5 text-[11.5px] text-ink-500">
              {holdings.length} holding{holdings.length === 1 ? '' : 's'}
              {net.reservedFromInvestments > 0 && (
                <> · {formatShort(net.reservedFromInvestments)} promised to goals</>
              )}
            </div>
          </div>
          <div
            className={cn(
              'flex shrink-0 items-center gap-1 text-[14px] font-semibold tabular-nums',
              portfolio.gain >= 0 ? 'text-moss-600' : 'text-rose-600'
            )}
          >
            {portfolio.gain >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <Money paise={Math.abs(portfolio.gain)} sign={portfolio.gain >= 0 ? '+' : '-'} />
            <span className="opacity-80">
              ({portfolio.returnPct >= 0 ? '+' : ''}
              {(portfolio.returnPct * 100).toFixed(1)}%)
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
