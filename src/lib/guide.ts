/**
 * The in-app guide (Settings → How Hisaab works, and shown once after
 * onboarding). Evergreen: keep this current as features land. The "What's new"
 * pane at the top of the guide reads the latest release from changelog.ts, so
 * that part updates itself; these sections are the lasting how-to.
 *
 * Each section names one lucide icon as its illustration (Hisaab keeps the art
 * simple and on-brand rather than bespoke drawings).
 */
export interface GuideSection {
  id: string;
  title: string;
  body: string[];
  steps?: string[];
  icon: string; // lucide-react icon name
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
  },
  {
    id: 'adding',
    title: 'Adding an entry',
    body: [
      'Tap the teal + in the middle of the bar to add anything. The amount pad leads, with the big serif figure growing as you type. Then pick expense, income, or transfer, choose an account and category, and save.',
      'Type a merchant and Hisaab pre-picks a likely category for you. "Save & add another" keeps the sheet open for quick multi-entry.',
    ],
    steps: [
      'Tap + → type the amount → pick the type and account → Save.',
      'Enter a merchant like "Blue Tokai" and the category is guessed for you.',
    ],
    icon: 'plus',
  },
  {
    id: 'ledger',
    title: 'The ledger',
    body: [
      'The Ledger is every entry, newest first, grouped by day with a running total for each day. Search by merchant or note, filter by type, and step between months.',
      'Tap any row to edit it; the same sheet handles changes and deletes.',
    ],
    icon: 'list',
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
      'This month\'s contributions feed the "goals set aside" in safe-to-spend.',
    ],
    icon: 'target',
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
  },
  {
    id: 'security',
    title: 'Truly end to end',
    body: [
      'Your ledger is encrypted with a key derived from a passphrase only you know. The backup to your account is sealed before it ever leaves your phone; the server holds ciphertext and timestamps, nothing readable.',
      'Because the server cannot decrypt, we cannot reset your passphrase. That is what the one-time Recovery Key is for, so keep it somewhere safe and offline.',
    ],
    steps: [
      'Change your passphrase any time in Settings → Vault; your data is not re-encrypted, only the key is re-wrapped.',
      'Export an encrypted backup, or a plain CSV, from Settings → Data.',
    ],
    icon: 'shield-check',
  },
  {
    id: 'sync',
    title: 'Across your devices',
    body: [
      'Sign in for backup and your ledger stays in step across devices, encrypted the whole way. It works offline too and catches up when you reconnect.',
      'The dot at the top right shows where things stand. Tap it any time to see what has changed.',
    ],
    steps: [
      'Grey means on this device only; amber means the vault is locked.',
      'A pulsing teal dot means backing up; steady teal means all backed up.',
    ],
    icon: 'refresh-cw',
  },
];
