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
  /**
   * One line saying what is inside, shown on the folded row. It is all a
   * reader sees of a folded section, so it has to earn the tap on its own.
   * The opening sections are already open and need none.
   */
  summary?: string;
  body: string[];
  steps?: string[];
  icon: string; // lucide-react icon name
  art: GuideArtKind;
  /** Part of the opening read, shown in full. See the note below. */
  essential?: boolean;
}

/**
 * The guide, in two parts.
 *
 * The first five sections are the opening read: what Hisaab is, where things
 * are, the one number on Home, adding an entry, and the balance sheet. They are
 * shown in full, and they are the whole of what somebody needs before they
 * start keeping their money here.
 *
 * Everything after them is folded away behind a one-line summary, opened only
 * by someone who wants it. **A new feature belongs there, not in the opening
 * read.** This screen is shown the moment onboarding ends, before anyone has
 * logged a single rupee, and it is worth reading only while it stays short.
 *
 * Two paragraphs and three steps is the shape of a section. Anything needing
 * more than that is usually a sign the screen itself should be doing the
 * explaining.
 */
export const GUIDE: GuideSection[] = [
  {
    id: 'idea',
    title: 'The idea',
    essential: true,
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
    essential: true,
    body: [
      'There are five places along the bottom. Home is the day-to-day answer: what is safe to spend, and where the month has gone. Ledger is every entry you have made. Money is everything you own. Insights is the longer view. Settings holds the rest, including this guide.',
      'Money is the one worth knowing about. Your accounts, your goals and your investments all live there together, because they are the same subject: what you have, and how much of it is already promised. The teal + at the bottom right adds an entry from anywhere. It is an action rather than a place, which is why it floats instead of sitting in the bar.',
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
    essential: true,
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
    essential: true,
    body: [
      'Tap the teal + at the bottom right to add anything. The amount pad leads, with the big serif figure growing as you type. Then pick expense, income, or transfer, choose an account and category, and save.',
      'Type a merchant like "Third Wave Coffee" and Hisaab pre-picks a likely category for you. Paise are welcome anywhere: the keypad works in them, so ₹123.45 is just those digits.',
    ],
    steps: [
      'Tap + at the bottom right, type the amount, pick the type and account, then Save.',
      '"Save & add another" keeps the sheet open when you have a few to put in.',
      'Turn on "Repeat this" for anything that comes round again. See Recurring below.',
    ],
    icon: 'plus',
    art: 'adding',
  },
  {
    id: 'money',
    title: 'Money, in one picture',
    essential: true,
    body: [
      'The Money tab is the whole balance sheet on one screen. At the top: what you hold, split between what is in your accounts and what is in your investments. Under it, what your goals have already claimed, and what is left genuinely free.',
      'Below that sit the three things it is made of. Your accounts with their running balances, your goals and what each wants this month, your portfolio and how it is doing. Goal money is never quietly counted as spendable: it is subtracted once, at the top, wherever it happens to be sitting.',
    ],
    steps: [
      'Tap Money in the bottom bar: what you hold, minus goals, equals free.',
      'Tap Manage on the Accounts section to add or edit an account, whether it is cash, a bank, a card or a wallet.',
      'Use the Transfer type to move money between your own accounts, so it never counts as spending.',
    ],
    icon: 'wallet',
    art: 'money',
  },

  // Everything below is folded away by default. New features go here.
  {
    id: 'denominations',
    title: 'The colour of money',
    summary: 'Every amount wears the colour of the note you would pay it with.',
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
    summary: 'Every entry you have made, by day, searchable.',
    body: [
      'The Ledger is every entry, newest first, grouped by day with a running total for each day. Search by merchant or note, filter by type, and step between months.',
      'Tap any row to edit it; the same sheet handles changes and deletes.',
    ],
    icon: 'list',
    art: 'ledger',
  },
  {
    id: 'goals',
    title: 'Goals, and what they need',
    summary: 'Save for something on a schedule that survives a missed month.',
    body: [
      'Set something worth saving for: a trip, a gift, a rainy-day fund. Say what it costs and where the money comes from, an account or a holding, so "the trip fund is in my savings" and "the house fund is in my flexi-cap" are both sayable. Whichever you pick, that money is held out of your free figure.',
      'Give it a schedule and the goal answers the only question that matters: how much to put in this month. Miss one and nothing is lost, the catch-up is folded into what this month asks for rather than quietly forgotten. Put in more than asked and it says you are ahead, and stops asking until the plan catches up with you.',
    ],
    steps: [
      'Open Money → All goals → New. Set the target, pick where the money comes from, and turn on "Save on a schedule".',
      'With a target date set, the plan offers the exact amount that lands it on time. Tap it to use it.',
      'This month\'s contributions feed the "goals set aside" figure in safe to spend.',
    ],
    icon: 'target',
    art: 'goalPlan',
  },
  {
    id: 'investments',
    title: 'Investments',
    summary: 'Your portfolio, valued by you, sealed like everything else.',
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
    summary: 'Where the month went, and whether you are ahead of pace.',
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
    summary: 'Rent, subscriptions and SIPs, counted before they arrive.',
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
    summary: 'Wear the colour of whichever rupee note you like.',
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
    summary: 'Sealed on your device. Your recovery phrase is the only way back in.',
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
    summary: 'Works offline, backs up encrypted, stays the same everywhere.',
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
    summary: 'A line straight to the person who writes it.',
    body: [
      'One person writes Hisaab, and Settings puts you in touch with them. If something is broken, say so plainly. If the app ought to do something it does not, say that too. Being certain or technical about it is not required.',
      'Your version and the device you are on ride along with the message, so you can describe what you saw and leave the rest. Your ledger stays out of it entirely, down to the last rupee. Everything gets read, bugs first, and an answer comes to the email you signed up with whenever there is one worth sending. Writing it offline works fine: the message waits on your device and goes out by itself once you have a connection.',
    ],
    steps: [
      'Open Settings and find "Make Hisaab Yours".',
      'Pick whether it is something broken or an idea, then write as much or as little as you like.',
    ],
    icon: 'send',
    art: 'message',
  },
];

/** The opening read: shown in full, and kept short on purpose. */
export const GUIDE_ESSENTIALS = GUIDE.filter((s) => s.essential);

/** The rest, folded behind their summaries until somebody wants them. */
export const GUIDE_MORE = GUIDE.filter((s) => !s.essential);
