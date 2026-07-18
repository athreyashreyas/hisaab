/**
 * The in-app guide (Settings → How Hisaab works, and shown once after
 * onboarding). Evergreen: keep this current as features land. The "What's new"
 * pane at the top of the guide reads the latest release from changelog.ts, so
 * that part updates itself; these sections are the lasting how-to.
 *
 * Each section carries a small illustration (`art`, drawn by GuideArt) so the
 * guide shows rather than only tells, plus a lucide icon used as its compact
 * marker beside the title.
 */

/** The illustrations GuideArt knows how to draw. One per guide section. */
export type GuideArtKind =
  | 'logo'
  | 'safeToSpend'
  | 'adding'
  | 'denominations'
  | 'ledger'
  | 'accounts'
  | 'goals'
  | 'investments'
  | 'insights'
  | 'security'
  | 'sync';

export interface GuideSection {
  id: string;
  title: string;
  body: string[];
  steps?: string[];
  icon: string; // lucide-react icon name
  art: GuideArtKind;
}

export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    body: [
      'Hisaab keeps an honest reckoning of where your money goes. You log expenses and income in a couple of taps, bucket them across accounts and categories, and read one clear number: what is genuinely safe to spend.',
      'Everything lives on your device first, so it is fast and works offline. The cloud copy is sealed before it leaves your phone, so no one but you can read it.',
    ],
    icon: 'notebook-pen',
    art: 'logo',
  },
  {
    id: 'safe-to-spend',
    title: 'Safe to spend',
    body: [
      'The teal card at the top of Home is the heart of Hisaab. It takes your income for the month, subtracts what you have spent, the bills still to come, and what you have set aside for goals, then shows what is truly free.',
      'It also breaks that into a per-day allowance for the days left, so a big number never tempts you into a lean second half of the month.',
    ],
    steps: [
      'The thin bar under the figure shows how much of the month has passed.',
      'The four-up split shows income, spent, bills to come, and goals set aside.',
    ],
    icon: 'wallet',
    art: 'safeToSpend',
  },
  {
    id: 'adding',
    title: 'Adding an entry',
    body: [
      'Tap the teal + at the bottom right to add anything. The amount pad leads, with the big serif figure growing as you type. Then pick expense, income, or transfer, choose an account and category, and save.',
      'Type a merchant and Hisaab pre-picks a likely category for you. "Save & add another" keeps the sheet open for quick multi-entry.',
    ],
    steps: [
      'Tap + at the bottom right, type the amount, pick the type and account, then Save.',
      'Swipe the sheet down, or tap outside it, to put it away without saving.',
      'Enter a merchant like "Third Wave Coffee" and the category is guessed for you.',
    ],
    icon: 'plus',
    art: 'adding',
  },
  {
    id: 'denominations',
    title: 'The colour of money',
    body: [
      'Every amount carries the colour of the note you would reach for to pay it. A ₹47 coffee reads in ₹50 blue, a ₹1,800 dinner in ₹2,000 magenta. It is the palette of the Indian rupee, brought into your ledger.',
      'You will see it as you type in the amount pad, and as a slim stripe down the left of each entry, so a glance at the ledger tells you the shape of your spending before you have read a single number.',
    ],
    steps: [
      'The note colour follows the amount, easing from one note to the next as it grows.',
      'Categories draw from the same banknote palette, so the whole app shares one language of colour.',
    ],
    icon: 'banknote',
    art: 'denominations',
  },
  {
    id: 'ledger',
    title: 'The ledger',
    body: [
      'The Ledger is every entry, newest first, grouped by day with a running total for each day. Search by merchant or note, filter by type, and step between months.',
      'Tap any row to edit it; the same sheet handles changes and deletes.',
    ],
    icon: 'list',
    art: 'ledger',
  },
  {
    id: 'accounts',
    title: 'Accounts',
    body: [
      'Keep cash, banks, cards, and wallets as separate accounts. Each carries its own running balance from an opening amount, and Home shows your net worth across them with a cash-versus-digital split.',
      'Transfers move money between two accounts without counting as spending.',
    ],
    steps: [
      'Open Settings → Accounts to add or edit an account.',
      'Use the Transfer type when moving money between your own accounts.',
    ],
    icon: 'landmark',
    art: 'accounts',
  },
  {
    id: 'goals',
    title: 'Goals',
    body: [
      'Set something worth saving for, like a trip, a gift, or a rainy-day fund. Each goal shows a progress ring and an honest guess of when you will get there at your recent pace.',
      'Give a goal a target date and Hisaab tells you whether you are on track and how much a month it needs if you are behind.',
    ],
    steps: [
      'Open Goals → New to create one, then Add money as you save.',
      'Choose which account each contribution comes from; two accounts can fund one goal.',
      'This month\'s contributions feed the "goals set aside" in safe-to-spend.',
    ],
    icon: 'target',
    art: 'goals',
  },
  {
    id: 'investments',
    title: 'Investments',
    body: [
      'The Invest tab keeps your portfolio in one place: stocks, mutual funds, fixed deposits, and anything else. Enter what you put in and the value today, and Hisaab shows the gain on each holding and across the whole portfolio.',
      'Hisaab makes no outbound calls, so there is no live price feed. You update a value whenever you like, and it stays sealed like the rest of your data. Fixed deposits can carry an interest rate and maturity date.',
    ],
    steps: [
      'Tap Invest → Add to log a holding and pick its type.',
      'Open any holding to update its current value as it moves.',
    ],
    icon: 'trending-up',
    art: 'investments',
  },
  {
    id: 'insights',
    title: 'Insights',
    body: [
      'Insights turns your entries into a calm picture: spending over time as day, week, or month; a category breakdown with how each moved against last month; and per-category budget pacing.',
      'Pacing reads spent-against-time, not just spent-against-total, so 90% of a budget on the 18th shows as "ahead of pace", a nudge rather than an alarm.',
    ],
    steps: [
      'Set a monthly budget on a category in Settings → Categories to see its pacing.',
      'Hisaab spots regular bills and offers them as recurring rules to confirm.',
    ],
    icon: 'pie-chart',
    art: 'insights',
  },
  {
    id: 'security',
    title: 'Truly end to end',
    body: [
      'Your ledger is encrypted with a key derived from your password, which only you know. The backup to your account is sealed before it ever leaves your phone, so the server holds ciphertext and timestamps, nothing readable.',
      'Your login is derived separately from the key to your data, so we can check who you are but can never read what you saved. Because we cannot decrypt, we cannot simply reset your password for you. That is what your twelve-word recovery phrase is for, so keep it somewhere safe and offline.',
    ],
    steps: [
      'Change your password any time in Settings, Security. Your data is not re-encrypted, only the key is re-wrapped, so it is instant.',
      'Forgot it? Tap Forgot password on the sign-in screen, follow the email, then set a new one with your recovery phrase.',
      'Export an encrypted backup, or a plain CSV, from Settings, Data.',
    ],
    icon: 'shield-check',
    art: 'security',
  },
  {
    id: 'sync',
    title: 'Across your devices',
    body: [
      'Sign in for backup and your ledger stays in step across devices, encrypted the whole way. It works offline too and catches up when you reconnect.',
      'The dot at the top right shows where things stand. Tap it to see what is happening and to sync right now, without closing and reopening the app. Syncing also looks for a new version of Hisaab and brings it in if there is one.',
    ],
    steps: [
      'Grey means on this device only, and amber means your ledger is locked.',
      'A pulsing teal dot means backing up, and steady teal means all backed up.',
      'Tap the dot, then Sync now, whenever you want to be sure you are current.',
    ],
    icon: 'refresh-cw',
    art: 'sync',
  },
];
