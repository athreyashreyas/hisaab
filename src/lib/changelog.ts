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
    version: '0.8.0',
    date: '2026-07-19',
    major: true,
    title: 'Dressed in the colour of a note',
    notes: [
      'Hisaab comes in themes now, each drawn from an Indian banknote. Deep ledger teal stays the default; you can also wear the blue of a fifty, the lavender of a hundred, the marigold of a two-hundred, the stone of a five-hundred, the magenta of the two-thousand, the greenish-yellow of a twenty, or the chocolate of a ten.',
      'Pick one in Settings → Appearance and the whole app re-skins at once — the paper takes a hint of the note, the accent becomes its colour, and income green and overspend rose stay put so money always reads the same. It is per-device and applies the instant the app opens.',
    ],
    howTo: [
      'Open Settings and find Appearance.',
      'Tap any note to wear it; tap Ledger Teal to go back to the default.',
    ],
    art: 'themes',
  },
  {
    version: '0.7.0',
    date: '2026-07-19',
    title: 'Bills you can add yourself',
    notes: [
      'Add a recurring payment by hand — rent, a subscription, an SIP. Set the amount, how often it repeats, and when it is next due, and it counts toward "Bills to come" on Home. No need to wait for Hisaab to spot it in your spending.',
      'Repeat it your way: daily, weekly, monthly, or yearly. A daily bill counts every day still left in the month.',
      'Tap any recurring payment to edit its amount, cadence, or account, or to remove it.',
    ],
    howTo: [
      'Open Insights, find Recurring, and tap Add.',
      'Set the amount, how often it repeats, and the next due date.',
      'Tap a saved payment any time to change or remove it.',
    ],
    art: 'sync',
  },
  {
    version: '0.6.0',
    date: '2026-07-18',
    major: true,
    title: 'Investments, and money that adds up',
    notes: [
      'A new Investments tab holds your whole portfolio — stocks, mutual funds, fixed deposits, and more. Log what you put in and its value today, and Hisaab shows each holding\'s return and how the portfolio is doing. No live price feed by design; you update values when you like, end-to-end encrypted like everything else.',
      'Saving toward a goal now draws from a real account. Pick which account sets the money aside, and two accounts can each fund a slice of one goal, so nothing is counted twice.',
      'Fixed set-aside money lingering after a withdrawal or a deleted goal. Added an Education & learning category, and long category names no longer get clipped. You also stay signed in now — once unlocked on a device, Hisaab keeps you in; tap Lock now in Settings to lock again.',
    ],
    howTo: [
      'Tap Invest in the bottom bar, then Add, to log a stock, mutual fund, or FD.',
      'Open a holding any time to update its current value and watch the return move.',
      'In a goal, tap Add money and choose which account it comes from.',
    ],
    art: 'investments',
  },
  {
    version: '0.5.0',
    date: '2026-07-18',
    major: true,
    title: 'The colour of money',
    notes: [
      'Amounts now carry the colour of the note you would reach for to pay them — a ₹47 coffee in ₹50 blue, a ₹1,800 dinner in ₹2,000 magenta. You will see it in the amount pad as you type and as a slim stripe down the left of each entry, so a glance tells you the shape of your spending.',
      'Categories share the same banknote palette, tuned to stay clear and legible for colour-blind readers too.',
      'What is new now greets you once per account, not once per device. Fixed a landscape crop at the top of the sign-in and setup screens.',
    ],
    howTo: [
      'Open the amount pad and watch the figure take on its note colour as the amount grows.',
      'Glance down the ledger: the left stripe on each entry is the note that would cover it.',
      'Read the full story in Settings, How Hisaab works, under "The colour of money".',
    ],
    art: 'denominations',
  },
  {
    version: '0.4.0',
    date: '2026-07-17',
    major: true,
    title: 'A steadier frame, and a Sync that means it',
    notes: [
      'Every screen now scrolls inside its own region, so the top of the app stays put and your entries stay clear of the status bar and the home indicator.',
      'Settings has moved into the bottom bar, carrying the guide and What\'s new with it, and the teal + now floats at the bottom right. The guide has illustrations too, each showing the real surface it describes.',
      'Tap the sync dot and Sync now sends up what you added, pulls in anything new, and picks up a newer version of Hisaab in one go. Swipe any sheet down to dismiss it, and sheets lift above the keyboard now.',
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
      'Signing in is simpler now: one email and one password. That single password logs you in and unlocks your ledger — no separate vault passphrase to remember.',
      'It stays end-to-end encrypted. Your login is derived separately from the key to your data, so the server can check who you are but never read what you saved.',
      'A twelve-word recovery phrase replaces the old recovery key. Keep it safe and offline — if you forget your password, it lets you reset it by email on any device without losing a thing.',
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
      'A gentle guided setup for new accounts: back up across your devices, lock your vault, save your recovery key, and add the accounts you keep, one calm step at a time.',
      'A new guide with two sides — What\'s new, and a full walk-through of the app. It greets you with the guide once right after setup, then steps aside; open it any time from Settings.',
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
      'Your ledger is locked with a passphrase only you know, and the backup is encrypted before it ever leaves your phone, so no one but you can read it.',
      'A single "safe to spend" number tells you what is genuinely free this month, after bills to come and goal set-asides. Set goals worth saving for and watch each one fill up.',
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
