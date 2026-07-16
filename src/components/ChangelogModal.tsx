import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { CHANGELOG, APP_VERSION } from '../lib/changelog';
import { format } from 'date-fns';

/**
 * Version-as-changelog: the modal opened from the sync dot and Settings. The
 * newest entry's version is the single source of truth for APP_VERSION (see
 * lib/changelog) — same convention as Attend and Harmony.
 */
export function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`Hisaab v${APP_VERSION}`}>
      <div className="divide-y divide-parchment-200 px-5 pb-5">
        {CHANGELOG.map((release) => (
          <div key={release.version} className="py-4 first:pt-3">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg text-ink-900">{release.title}</h3>
              {release.major && <Badge tone="teal">v{release.version}</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-ink-500">
              {format(new Date(release.date), 'd MMMM yyyy')} · v{release.version}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {release.notes.map((note, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-700">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
