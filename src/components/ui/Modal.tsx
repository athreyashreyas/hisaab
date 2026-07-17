import { useEffect } from 'react';
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
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
                <h2 className="font-serif text-xl text-ink-900">{title}</h2>
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
