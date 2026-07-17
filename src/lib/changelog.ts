import type { GuideArtKind } from './guide';

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
  /** Optional illustration for the release, drawn by GuideArt. Give the big
   *  releases one so What's new shows the thing, not just words about it. */
  art?: GuideArtKind;
}

/**
 * Release notes, newest first. Add a new entry at the top for every version
 * bump; keep the tone warm and plain. The first entry's version is the single
 * source of truth for APP_VERSION, exactly as in Attend and Harmony.
 */
export const CHANGELOG: Release[] = [
  {
    version: '0.4.0',
    date: '2026-07-17',
    major: true,
    title: 'A steadier frame, and a Sync that means it',
    notes: [
      'Nothing slides under the clock any more. Every screen now scrolls inside its own region, so the top of the app stays put and your entries stay clear of the status bar and the home indicator.',
      'Settings has moved into the bar at the bottom, where it is always a tap away, and it carries the guide and What\'s new with it. The teal + is now a floating button at the bottom right, so adding a spend is still the easiest thing in the app.',
      'The guide has illustrations now. Each section shows the real surface it is describing, from the safe-to-spend card to the goal ring to what your data actually looks like once it leaves your phone.',
      'Tap the sync dot and Sync now does what it says: it sends up what you have added, pulls in anything new, and looks for a newer version of Hisaab. If one is waiting, it lands right then, with no need to delete and re-add your home-screen icon.',
      'Sheets close the way you expect. Swipe down on the handle of the add sheet, or any sheet, and it goes away. They also lift above the keyboard now, so the field you are typing in stays where you can see it.',
    ],
    howTo: [
      'Tap Settings at the right of the bottom bar for the guide, What\'s new, and everything else.',
      'Tap the teal + at the bottom right to add a spend, then swipe the sheet down to put it away.',
      'Tap the dot at the top right, then Sync now, to back up and pick up a new version in one go.',
    ],
    art: 'sync',
  },
  {
    version: '0.3.0',
    date: '2026-07-17',
    major: true,
    title: 'One password, and a recovery phrase',
    notes: [
      'Signing in is simpler now: one email and one password. That single password logs you in and unlocks your ledger, so there is no separate vault passphrase to remember.',
      'It stays end to end encrypted. Your login is derived separately from the key to your data, so the server can check who you are but can never read what you saved.',
      'A twelve-word recovery phrase replaces the old recovery key. Keep it safe and offline: if you ever forget your password, it is what lets you reset it without losing a thing.',
      'Forgot your password? Reset it by email and set a new one with your recovery phrase, on any device.',
    ],
    howTo: [
      'Sign in with your email and password, the same one everywhere.',
      'Save your recovery phrase when you set up, or make a new one in Settings, Security.',
      'To reset, tap Forgot password on the sign-in screen and follow the email.',
    ],
    art: 'security',
  },
  {
    version: '0.2.0',
    date: '2026-07-17',
    major: true,
    title: 'A friendly welcome, and a guide',
    notes: [
      'A gentle guided setup for new accounts: back up across your devices, lock your vault, save your Recovery Key, and add the accounts you keep, one calm step at a time.',
      'A new guide with two sides: What\'s new, and a walk-through of everything, from safe-to-spend and adding entries to the ledger, accounts, goals, insights, and how your data stays encrypted.',
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
