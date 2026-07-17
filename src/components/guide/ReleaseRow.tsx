import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Release } from '../../lib/changelog';

/**
 * One expandable release in the guide's "What's new" pane. Tapping the row
 * reveals its notes and, if present, terse how-to steps. Major (feature)
 * releases are tinted teal and badged. Ported from Harmony's ReleaseRow.
 */
export function ReleaseRow({ release, defaultOpen }: { release: Release; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={
        release.major
          ? 'overflow-hidden rounded-card bg-teal-50 ring-1 ring-teal-100'
          : 'overflow-hidden rounded-card bg-parchment-50 ring-1 ring-parchment-200'
      }
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700 tabular-nums">
          {release.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-ink-900">{release.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">{format(new Date(release.date), 'd MMMM yyyy')}</span>
            {release.major && (
              <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Major
              </span>
            )}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-ink-300"
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">Release notes</p>
              <ul className="mt-2 space-y-2">
                {release.notes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {release.howTo && release.howTo.length > 0 && (
              <div className="mt-5 px-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">How to find it</p>
                <ol className="mt-2 space-y-2">
                  {release.howTo.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-700 tabular-nums">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
