import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropVariants, modalVariants } from '../../lib/motion';
import { cn } from '../../lib/cn';

/** Centered modal with a parchment backdrop. Escape + backdrop click close it. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // The safe-area insets have to be padding on this container, not just
          // a max-height on the panel below: `inset-0` covers the whole window
          // including the status bar, so a tall modal (the goal form) would grow
          // up under the clock and the wifi/battery icons. A flat p-4 wasn't
          // enough — the top inset on a notched iPhone is roughly three times
          // that. The panel's max-height is a percentage of this element's
          // content box, so padding here shrinks it to match automatically.
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            paddingTop: 'max(1rem, calc(var(--safe-top) + 0.5rem))',
            paddingBottom: 'max(1rem, calc(var(--safe-bottom) + 0.5rem))',
            paddingLeft: 'max(1rem, var(--safe-left))',
            paddingRight: 'max(1rem, var(--safe-right))',
          }}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title != null ? titleId : undefined}
            className={cn(
              'relative z-10 w-full max-w-md overflow-y-auto scroll-ios rounded-sheet bg-parchment-100 shadow-xl',
              className
            )}
            // Lift above the on-screen keyboard and cap to the room left, so a
            // modal with fields in it can never be pushed under the status bar.
            style={{
              marginBottom: 'var(--keyboard-height, 0px)',
              maxHeight: 'calc(100% - var(--keyboard-height, 0px))',
              transition: 'margin-bottom 0.2s ease, max-height 0.2s ease',
            }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {title != null && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-parchment-200 bg-parchment-100/95 px-5 py-3.5 backdrop-blur">
                <h2 id={titleId} className="font-serif text-xl text-ink-900">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-parchment-200"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
