export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  major?: boolean;
}

/**
 * Release notes, newest first. Add a new entry at the top for every version
 * bump; keep the tone warm and plain. The first entry's version is the single
 * source of truth for APP_VERSION, exactly as in Attend and Harmony.
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.1.0',
    date: '2026-07-16',
    major: true,
    title: 'Hello, Hisaab',
    notes: [
      'Keep a clean reckoning of where your money goes. Log any expense or income in a couple of taps, split cash and cards across accounts, and see it all on your device first.',
      'Your ledger is locked with a passphrase only you know. The backup to your account is encrypted before it ever leaves your phone, so no one but you can read it.',
      'A single "safe to spend" number up top tells you what is genuinely free this month, after the bills still to come and what you have set aside for your goals.',
      'Set goals worth saving for and watch each one fill up, with an honest guess of when you will get there.',
    ],
  },
];

/** Current app version, taken from the newest release. */
export const APP_VERSION = CHANGELOG[0].version;
