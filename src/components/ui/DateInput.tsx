import { useState } from 'react';
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  isAfter,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../../lib/motion';
import { midnight } from '../../lib/repo';
import { cn } from '../../lib/cn';

interface DateInputProps {
  label?: string;
  value: number; // epoch ms (local midnight)
  onChange: (epoch: number) => void;
  className?: string;
  max?: number;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * In-app date picker — deliberately not the OS `<input type="date">`. It draws
 * its own calendar so it looks and behaves the same on every device, and it
 * follows the app's one rule for pickers: open, tap a day, and it applies and
 * closes at once — no separate "Done", no tapping elsewhere to dismiss.
 *
 * Month navigation (the arrows) stays open because it isn't a selection; only
 * choosing a day commits and closes.
 */
export function DateInput({ label, value, onChange, className, max }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(value));

  function openPicker() {
    setView(startOfMonth(value)); // always land on the month of the current value
    setOpen(true);
  }

  function pick(day: Date) {
    onChange(midnight(day));
    setOpen(false); // auto-apply + auto-close on a single tap
  }

  // Six weeks of cells from the Sunday on/before the 1st — a stable 42-day grid.
  const gridStart = startOfWeek(startOfMonth(view), { weekStartsOn: 0 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const maxDate = max != null ? new Date(max) : null;

  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</label>}
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          'flex w-full items-center justify-between rounded-card border border-parchment-300 bg-parchment-50 ' +
            'px-3.5 py-2.5 text-left text-[15px] text-ink-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400',
          className
        )}
      >
        <span>{format(value, 'd MMM yyyy')}</span>
        <CalendarDays size={17} className="shrink-0 text-ink-400" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
              <motion.div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-[320px] rounded-sheet bg-parchment-100 p-4 shadow-xl"
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setView((v) => addMonths(v, -1))}
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-parchment-200"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-serif text-lg text-ink-900">{format(view, 'MMMM yyyy')}</span>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setView((v) => addMonths(v, 1))}
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-parchment-200"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  {WEEKDAYS.map((d, i) => (
                    <span key={i} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((day) => {
                    const inMonth = isSameMonth(day, view);
                    const selected = isSameDay(day, value);
                    const disabled = maxDate != null && isAfter(day, maxDate);
                    return (
                      <button
                        key={day.getTime()}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(day)}
                        className={cn(
                          'mx-auto grid h-9 w-9 place-items-center rounded-full text-[13.5px] tabular-nums transition-colors',
                          selected
                            ? 'bg-teal-500 font-semibold text-white'
                            : inMonth
                              ? 'text-ink-900 hover:bg-parchment-200'
                              : 'text-ink-250 hover:bg-parchment-200',
                          disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent'
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
