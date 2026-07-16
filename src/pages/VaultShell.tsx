/** Centered parchment canvas for the vault screens (Setup / Unlock), no nav. */
export function VaultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto scroll-ios bg-parchment-100 px-5 py-10">
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
  );
}
