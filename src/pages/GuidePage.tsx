import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { APP_VERSION, CHANGELOG } from '../lib/changelog';
import { GUIDE, type GuideSection } from '../lib/guide';
import { ReleaseRow } from '../components/guide/ReleaseRow';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/cn';

type Pane = 'new' | 'guide';

/**
 * The two-sided guide (ported from Harmony's GuideScreen, teal/money): "What's
 * new" reads the changelog; "Guide" is the evergreen walk-through from guide.ts.
 *
 * Entry intent comes from ?pane= — onboarding sends people to the walk-through
 * (?pane=guide); a version bump auto-opens What's new (?pane=new); Settings can
 * open either. This is a full-screen route rendered above the shell.
 */
export function GuidePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entryPane = params.get('pane');
  const initial: Pane = entryPane === 'guide' ? 'guide' : 'new';
  const [pane, setPane] = useState<Pane>(initial);
  const [historyOpen, setHistoryOpen] = useState(false);

  const latest = CHANGELOG[0];
  const earlier = CHANGELOG.slice(1);

  const done = () => navigate('/', { replace: true });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-parchment-100">
      <header className="flex items-center justify-between px-4 pt-safe">
        <div className="flex h-14 items-center">
          <button
            onClick={done}
            aria-label="Back to Hisaab"
            className="-ml-1.5 grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-parchment-200"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
        <span className="text-xs tabular-nums text-ink-300">Hisaab {APP_VERSION}</span>
      </header>

      <div className="scroll-ios min-h-0 flex-1 overflow-y-auto pb-safe">
        <main className="mx-auto w-full max-w-md px-5 pb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">
            How Hisaab works
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight text-ink-900">
            An honest reckoning, made simple.
          </h1>

          <div role="tablist" aria-label="Guide" className="mt-6 flex gap-1 rounded-full bg-parchment-200 p-1">
            {(
              [
                ['new', "What's new"],
                ['guide', 'Guide'],
              ] as const
            ).map(([value, label]) => {
              const active = pane === value;
              return (
                <button
                  key={value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPane(value)}
                  className={cn(
                    'flex-1 rounded-full py-2 text-sm font-semibold transition-colors',
                    active ? 'bg-parchment-50 text-ink-900 shadow-sm' : 'text-ink-300'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {pane === 'new' ? (
            <div className="mt-7">
              {latest && <ReleaseRow release={latest} defaultOpen />}
              {earlier.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setHistoryOpen((o) => !o)}
                    aria-expanded={historyOpen}
                    className="flex w-full items-center justify-between py-2 text-left"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">
                      Earlier versions
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn('text-ink-300 transition-transform', historyOpen && 'rotate-180')}
                    />
                  </button>
                  {historyOpen && (
                    <div className="mt-2 space-y-2">
                      {earlier.map((release) => (
                        <ReleaseRow key={release.version} release={release} defaultOpen={false} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {GUIDE.map((section) => (
                <Section key={section.id} section={section} />
              ))}
            </div>
          )}

          <button
            onClick={done}
            className="mt-10 w-full rounded-full bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Back to Hisaab
          </button>
        </main>
      </div>
    </div>
  );
}

function Section({ section }: { section: GuideSection }) {
  return (
    <section className="border-t border-parchment-200 pt-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-teal-50 text-teal-600">
          <Icon name={section.icon} size={20} />
        </span>
        <h2 className="font-serif text-2xl text-ink-900">{section.title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {section.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink-700">
            {p}
          </p>
        ))}
      </div>
      {section.steps && (
        <ul className="mt-4 space-y-2">
          {section.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-500">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
