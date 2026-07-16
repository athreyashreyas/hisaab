import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { backdropVariants, sheetVariants } from '../../lib/motion';
import { cn } from '../../lib/cn';

/**
 * Bottom sheet — the primary surface for Add/Edit on phones. Slides up, caps its
 * height, and scrolls internally. On md+ it centers like a dialog but keeps the
 * sheet affordance (drag handle) so the whole suite feels consistent.
 */
export function BottomSheet({
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
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
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
              'relative z-10 flex w-full max-w-md flex-col rounded-t-sheet bg-parchment-100 shadow-2xl',
              'max-h-[92vh] sm:max-h-[88vh] sm:rounded-sheet',
              className
            )}
            style={{ paddingBottom: 'var(--keyboard-height)' }}
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="flex flex-col items-center pt-2.5">
              <div className="h-1 w-9 rounded-full bg-parchment-300" />
            </div>
            {title != null && (
              <div className="px-5 pb-1 pt-3">
                <h2 className="font-serif text-2xl text-ink-900">{title}</h2>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto scroll-ios">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
