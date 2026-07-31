import { addMonths, format } from 'date-fns';
import { Card } from '../ui/Card';
import { Money } from '../ui/Money';
import { Button } from '../ui/Button';
import { PaceChip, formatShort } from './GoalRow';
import { cadenceLabel } from '../../lib/calculations';
import { type GoalPace } from '../../lib/goals';
import type { Goal } from '../../types';
import { cn } from '../../lib/cn';

/**
 * "What do I need to put in?" — the question a goal screen exists to answer, and
 * the one the old screen never quite did: it could say "behind, needs ₹4,000/mo"
 * but not what *this* month still wants, what next month will want, or how far
 * off the pace you actually are.
 *
 * The headline is always a single amount and a single month. Underneath, a bar
 * shows how much of this month's ask is already in, and one plain sentence says
 * why the number is what it is. Every pace state gets its own copy, including the
 * quiet ones — a goal with no plan is told what it's missing rather than being
 * given a verdict it hasn't earned.
 */
export function GoalPaceCard({
  goal,
  pace,
  onSetPlan,
  className,
}: {
  goal: Goal;
  pace: GoalPace;
  /** Opens the goal editor, for the states whose fix is "give me a plan". */
  onSetPlan?: () => void;
  className?: string;
}) {
  const now = new Date();
  const thisMonth = format(now, 'MMMM');
  const nextMonth = format(addMonths(now, 1), 'MMMM');

  // The month's whole ask: what's already in, plus what's still wanted.
  const monthAsk = pace.addedThisMonth + pace.dueThisMonth;
  const filled = monthAsk > 0 ? Math.min(1, Math.max(0, pace.addedThisMonth / monthAsk)) : 1;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <PaceChip pace={pace} />
        {pace.dueNextMonth > 0 && (
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-500">
              Then {nextMonth}
            </div>
            <Money paise={pace.dueNextMonth} className="text-[14px] font-semibold text-ink-700" />
          </div>
        )}
      </div>

      <Headline pace={pace} goal={goal} thisMonth={thisMonth} />

      {monthAsk > 0 && pace.state !== 'reached' && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-parchment-200">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pace.dueThisMonth === 0 ? 'bg-moss-500' : 'bg-teal-500'
              )}
              style={{ width: `${filled * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-[11.5px] tabular-nums text-ink-500">
            <span>
              <Money paise={pace.addedThisMonth} className="font-semibold text-ink-700" /> in so far
            </span>
            <span>{thisMonth}&rsquo;s ask {formatShort(monthAsk)}</span>
          </div>
        </div>
      )}

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-500">
        <Explainer goal={goal} pace={pace} />
      </p>

      {(pace.state === 'unplanned' || pace.state === 'overdue') && onSetPlan && (
        <Button size="sm" variant="secondary" onClick={onSetPlan} className="mt-3">
          {pace.state === 'overdue' ? 'Move the date' : 'Set a plan'}
        </Button>
      )}
    </Card>
  );
}

function Headline({ pace, goal, thisMonth }: { pace: GoalPace; goal: Goal; thisMonth: string }) {
  if (pace.state === 'reached') {
    return (
      <div className="mt-2">
        <div className="font-serif text-[26px] leading-tight text-moss-600">
          <Money paise={goal.saved} /> saved
        </div>
        <div className="text-[13px] text-ink-500">You got there.</div>
      </div>
    );
  }

  if (pace.state === 'unplanned') {
    return (
      <div className="mt-2">
        <div className="font-serif text-[22px] leading-tight text-ink-900">
          {formatShort(pace.remaining)} to go
        </div>
        <div className="text-[13px] text-ink-500">No monthly ask yet</div>
      </div>
    );
  }

  if (pace.dueThisMonth === 0) {
    return (
      <div className="mt-2">
        <div className="font-serif text-[26px] leading-tight text-moss-600">
          Nothing due in {thisMonth}
        </div>
        <div className="text-[13px] text-ink-500">
          {formatShort(pace.remaining)} still to go overall
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">
        Add in {thisMonth}
      </div>
      <Money
        paise={pace.dueThisMonth}
        className={cn(
          'mt-0.5 block text-[30px] leading-none',
          pace.state === 'behind' || pace.state === 'overdue' ? 'text-amber-600' : 'text-ink-900'
        )}
      />
    </div>
  );
}

function Explainer({ goal, pace }: { goal: Goal; pace: GoalPace }) {
  const planLine =
    goal.plan_amount && goal.plan_cadence
      ? `${formatShort(goal.plan_amount)} ${cadenceLabel(goal.plan_cadence, goal.plan_interval).toLowerCase()}`
      : null;

  switch (pace.state) {
    case 'reached':
      return <>Every rupee is in. Withdraw it when you need it, or raise the target.</>;

    case 'ahead': {
      const by = Math.abs(pace.driftPayments) >= 1
        ? `${Math.abs(pace.driftPayments)} payment${Math.abs(pace.driftPayments) === 1 ? '' : 's'}`
        : formatShort(Math.abs(pace.drift));
      return (
        <>
          You&rsquo;re {by} ahead of {planLine ? `your ${planLine} plan` : 'the pace your date needs'}.
          {pace.etaDate && (
            <> At this rate you finish around {format(pace.etaDate, 'MMM yyyy')}.</>
          )}
        </>
      );
    }

    case 'on-track':
      return (
        <>
          Level with {planLine ? `your ${planLine} plan` : 'the pace your date needs'}.
          {pace.nextDue && <> Next payment {format(pace.nextDue, 'd MMM')}.</>}
        </>
      );

    case 'behind': {
      const missed = Math.abs(pace.driftPayments);
      return (
        <>
          {missed >= 1 ? (
            <>
              {missed} payment{missed === 1 ? '' : 's'} of {planLine ?? 'your plan'} hasn&rsquo;t gone
              in, so this month&rsquo;s figure includes the catch-up.
            </>
          ) : (
            <>
              You&rsquo;re {formatShort(Math.abs(pace.drift))} short of where the plan says you should
              be, and this month&rsquo;s figure makes it up.
            </>
          )}
        </>
      );
    }

    case 'overdue':
      return (
        <>
          The target date was {goal.target_date ? format(goal.target_date, 'd MMM yyyy') : 'in the past'},
          and {formatShort(pace.remaining)} is still to go. Move the date, or put the rest in.
        </>
      );

    case 'upcoming':
      if (pace.nextDue) {
        return (
          <>
            First payment of {formatShort(goal.plan_amount ?? 0)} is due {format(pace.nextDue, 'd MMM yyyy')}.
            Nothing is behind until then.
          </>
        );
      }
      return (
        <>
          Nothing in yet.
          {pace.requiredPerMonth
            ? ` About ${formatShort(pace.requiredPerMonth)} a month hits your date.`
            : ''}
        </>
      );

    case 'unplanned':
    default:
      return pace.etaDate ? (
        <>
          At what you&rsquo;ve been putting in you&rsquo;d get there around{' '}
          {format(pace.etaDate, 'MMM yyyy')}. Give it a date or a schedule for a firm monthly figure.
        </>
      ) : (
        <>
          Give this goal a target date or a saving schedule and Hisaab will tell you exactly what to
          put in each month, and say so when you fall behind.
        </>
      );
  }
}
