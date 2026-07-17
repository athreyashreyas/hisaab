export interface Release {
  version: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  notes: string[];
  major?: boolean;
  /** Terse, followable steps for finding and using what the release brought,
   *  written for how the app navigates today. Shown under an open release in
   *  the guide's "What's new" pane. */
  howTo?: string[];
}

/**
 * Release notes, newest first. Add a new entry at the top for every version
 * bump; keep the tone warm and plain. The first entry's version is the single
 * source of truth for APP_VERSION, exactly as in Attend and Harmony.
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.2.0',
    date: '2026-07-17',
    major: true,
    title: 'A friendly welcome, and a guide',
    notes: [
      'A gentle guided setup for new accounts: back up across your devices, lock your vault, save your Recovery Key, and add the accounts you keep — one calm step at a time.',
      'A new guide with two sides: What\'s new, and a walk-through of everything — safe-to-spend, adding entries, the ledger, accounts, goals, insights, and how your data stays encrypted.',
      'It greets you with the full guide once, right after you set up, so your first moments have a friendly hand to hold. Open it any time from Settings.',
      'What\'s new now greets you just once per update, then steps aside.',
    ],
    howTo: [
      'Open Settings → How Hisaab works for the full walk-through any time.',
      'Stay on "What\'s new" to read each release, or tap "Guide" for the how-to.',
      'Back up across devices from Settings → Sign in for encrypted backup.',
    ],
  },
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
    howTo: [
      'Tap the teal + to add an expense or income; the amount pad leads.',
      'Read the safe-to-spend card on Home for what is genuinely free this month.',
      'Open Goals to set something worth saving for and track it.',
    ],
  },
];

/** Current app version, taken from the newest release. */
export const APP_VERSION = CHANGELOG[0].version;
