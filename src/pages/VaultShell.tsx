/**
 * Centered parchment canvas for the account screens (Sign in / Unlock / Reset),
 * no nav.
 *
 * The safe-area insets sit on the outer frame, outside the scroller, so a tall
 * screen (or a focused field pushing content up) scrolls within its own region
 * rather than sliding under the status bar. Same rule as AppShell.
 *
 * The centring is deliberately done by a `min-h-full` inner box rather than
 * `items-center` on the scroller itself. Centring a flex container's overflow
 * pushes the top of the content above the scroll origin, where it can never be
 * scrolled back to: you can only ever scroll *down* into overflow. That reads as
 * the top being cropped, and it shows up in landscape, where the viewport is
 * short enough for this screen to outgrow it. min-h-full centres when there is
 * room to spare and simply grows (top-aligned, fully scrollable) when there
 * isn't.
 */
export function VaultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col bg-parchment-100 pb-safe pl-safe pr-safe pt-safe">
      <div className="scroll-ios min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col justify-center px-5 py-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-teal-500 font-serif text-3xl text-white shadow-lg">
                ₹
              </div>
              <h1 className="mt-3 font-serif text-3xl text-ink-900">Hisaab</h1>
              <p className="mt-1 text-sm text-ink-500">
                An honest reckoning of where your money goes.
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
