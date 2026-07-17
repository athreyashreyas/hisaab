/**
 * Centered parchment canvas for the account screens (Sign in / Unlock / Reset),
 * no nav.
 *
 * The safe-area insets sit on the outer frame, outside the scroller, so a tall
 * screen (or a focused field pushing content up) scrolls within its own region
 * rather than sliding under the status bar. Same rule as AppShell.
 */
export function VaultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col bg-parchment-100 pb-safe pl-safe pr-safe pt-safe">
      <div className="scroll-ios flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-teal-500 font-serif text-3xl text-white shadow-lg">
              ₹
            </div>
            <h1 className="mt-3 font-serif text-3xl text-ink-900">Hisaab</h1>
            <p className="mt-1 text-sm text-ink-500">An honest reckoning of where your money goes.</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
