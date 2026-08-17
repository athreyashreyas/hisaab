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
  | 'clarity'
  | 'nav'
  | 'safeToSpend'
  | 'adding'
  | 'denominations'
  | 'ledger'
  | 'accounts'
  | 'money'
  | 'goals'
  | 'goalPlan'
  | 'investments'
  | 'insights'
  | 'recurring'
  | 'themes'
  | 'security'
  | 'sync'
  | 'message';

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
    id: 'finding-your-way',
    title: 'Finding your way',
    body: [
      'There are five places to go, along the bottom. Home is the day-to-day answer: what is safe to spend and where the month has gone. Ledger is every entry you have made. Money is everything you own. Insights is the longer view. Settings holds the rest, including this guide.',
      'Money is the one worth knowing about. Your accounts, your goals and your investments all live there, on one screen, because they are the same subject: what you have, and how much of it is already promised. Tap through from there to any of the three.',
      'The teal + at the bottom right adds an entry from anywhere. It is an action, not a place, which is why it floats instead of sitting in the bar.',
    ],
    steps: [
      'Tap Money to see what you hold, what goals have claimed, and what is free.',
      'From Money, tap All goals, Portfolio, or Manage to open each in full.',
      'Every amount you type anywhere uses Hisaab\'s own keypad, never the phone keyboard.',
    ],
    icon: 'wallet',
    art: 'nav',
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
      'Paise are welcome anywhere. The keypad works in paise, so ₹123.45 is just those digits, and amounts that carry paise are shown in full rather than rounded.',
      'Turn on "Repeat this" to schedule the same entry on a cadence; see Recurring below.',
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
    id: 'money',
    title: 'Money, in one picture',
    body: [
      'The Money tab is the whole balance sheet on one screen. At the top: what you hold, split between what is in your accounts and what is in your investments. Under it, what your goals have already claimed, and what is left genuinely free.',
      'Below that, the three things it is made of. Your accounts with their running balances. Your goals and what each wants this month. Your portfolio and how it is doing. Tap any of them to open it in full.',
      'Keep cash, banks, cards and wallets as separate accounts, each with its own opening balance. Transfers move money between two of your own accounts without counting as spending. Goal money is never quietly counted as spendable: it is subtracted once, at the top, wherever it happens to be sitting.',
    ],
    steps: [
      'Tap Money in the bottom bar for what you hold, minus goals, equals free.',
      'Tap Manage on the Accounts section to add or edit an account.',
      'Use the Transfer type when moving money between your own accounts.',
    ],
    icon: 'wallet',
    art: 'money',
  },
  {
    id: 'goals',
    title: 'Goals, and what they need',
    body: [
      'Set something worth saving for: a trip, a gift, a rainy-day fund. Tell Hisaab what it costs, and it tracks the rest with a progress ring and a plain verdict on how you are doing.',
      'Say where the money comes from. A goal can be funded out of an account or out of a holding, so "the trip fund is in my savings" and "the house fund is in my flexi-cap" are both sayable. Whichever you pick, that money is held out of your free figure, and the goal shows a Funded from breakdown once more than one source has chipped in.',
      'Set a schedule and the question becomes answerable. Choose an amount and how often you will put it in, weekly, monthly, every two weeks, whatever the real rhythm is, and the goal screen leads with a single figure: how much to add this month. Next month is shown beside it.',
      'Miss one and nothing is lost. A skipped payment shows as being behind by that many payments, and the catch-up is folded into what this month asks for rather than quietly forgotten. Put in more than asked and it says you are ahead, and stops asking until the plan catches up with you.',
    ],
    steps: [
      'Open Money → All goals → New. Set the target, pick where the money comes from, and turn on "Save on a schedule".',
      'With a target date set, the plan offers the exact amount that lands it on time. Tap it to use it.',
      'Tap Add money as you save, and tap any history entry to fix its amount, date, or source.',
      'This month\'s contributions feed the "goals set aside" figure in safe-to-spend.',
    ],
    icon: 'target',
    art: 'goalPlan',
  },
  {
    id: 'investments',
    title: 'Investments',
    body: [
      'The Invest tab keeps your portfolio in one place: stocks, mutual funds, fixed deposits, and anything else. Enter what you put in and the value today, and Hisaab shows the gain on each holding and across the whole portfolio.',
      'Hisaab makes no outbound calls, so there is no live price feed. You update a value whenever you like, and it stays sealed like the rest of your data. Fixed deposits can carry an interest rate and maturity date.',
    ],
    steps: [
      'Open Money → Portfolio → Add to log a holding and pick its type.',
      'Open any holding to update its current value as it moves.',
      'A holding that is backing a goal says so, with the amount that is spoken for.',
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
      'Set a monthly budget on a category in Settings → Categories & budgets to see its pacing.',
      'That screen also carries a tray of extra categories, from pets to tolls to domestic help, that you can add with one tap when you need them.',
      'Hisaab spots regular bills and offers them as recurring rules to confirm.',
    ],
    icon: 'pie-chart',
    art: 'insights',
  },
  {
    id: 'recurring',
    title: 'Recurring, your way',
    body: [
      'Rent, a subscription, an SIP: anything that repeats can be scheduled so it counts toward "Bills to come" without you re-entering it. Set the amount, how often it repeats, and when it is next due.',
      'The cadence is yours to shape. Repeat every day, week, month or year, or set a custom interval like every 2 weeks or every 3 months. Hisaab spots regular bills in your spending too, and offers them for you to confirm.',
    ],
    steps: [
      'From the Add sheet, turn on "Repeat this" and set the cadence, then Save.',
      'Or open Insights → Recurring → Add to declare one outright.',
      'When you add an investment, turn on "Invest on a schedule (SIP)" to plan a repeating contribution.',
    ],
    icon: 'repeat',
    art: 'recurring',
  },
  {
    id: 'themes',
    title: 'The colour you wear',
    body: [
      'Hisaab comes in themes drawn from the Indian rupee notes. Deep ledger teal is the default, and you can switch to the blue of a fifty, the lavender of a hundred, the marigold of a two-hundred, the olive of a five-hundred, the magenta of the two-thousand, the greenish-yellow of a twenty, or the chocolate of a ten.',
      'The paper takes a hint of the note and the accent becomes its colour, while income green, overspend rose, and the note stripes on each entry stay constant so money always reads the same. It is a per-device choice and applies the instant the app opens.',
    ],
    steps: [
      'Open Settings → Appearance and tap a note to wear it.',
      'Tap Ledger Teal to return to the default any time.',
    ],
    icon: 'banknote',
    art: 'themes',
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
  {
    id: 'yours',
    title: 'Making Hisaab yours',
    body: [
      'One person makes Hisaab, and Settings has a line straight to them. If something is broken, say so. If the app should do something it does not yet do, say that too. You do not have to be certain, you do not have to be technical, and you do not have to soften it.',
      'Your version and the device you are holding travel with the message, so you can describe what you saw and leave the rest alone. Nothing from your ledger goes with it: not a figure, not an account name, nothing.',
      'They read all of it. Bugs are looked at quickly, ideas are thought about properly, and where there is an answer worth giving it comes to the email you signed up with.',
      'Writing it offline is fine. The message waits on your device and goes out by itself the next time you have a connection, so you can close the app and forget you sent it.',
    ],
    steps: [
      'Open Settings and scroll to "Make Hisaab Yours".',
      'Choose whether it is something broken or an idea, then write as much or as little as you like.',
    ],
    icon: 'send',
    art: 'message',
  },
];
