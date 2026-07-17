import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { backdropVariants, sheetVariants } from '../../lib/motion';
import { cn } from '../../lib/cn';

/**
 * Bottom sheet — the primary surface for Add/Edit on phones. Slides up, caps its
 * height, and scrolls internally. On md+ it centers like a dialog but keeps the
 * sheet affordance (drag handle) so the whole suite feels consistent.
 *
 * Swipe down to dismiss: the grip and the title area are the drag surface, and
 * the panel body is left alone so a long form can still scroll freely. That
 * split is why dragListener is off and the grip starts the drag by hand — a
 * whole-panel drag listener would swallow every scroll gesture in the body.
 * Drag past ~120px (or flick) and it closes; anything less springs back.
 *
 * Sizing accounts for the on-screen keyboard (--keyboard-height, published by
 * main.tsx) and the status bar: the sheet lifts above the keyboard and caps its
 * height to the room left between the two, so a tall sheet can never be pushed
 * up under the clock.
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
  const dragControls = useDragControls();

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
              'sm:rounded-sheet',
              className
            )}
            style={{
              marginBottom: 'var(--keyboard-height, 0px)',
              maxHeight:
                'calc(100% - var(--keyboard-height, 0px) - var(--safe-top, 0px) - 0.5rem)',
              transition: 'margin-bottom 0.2s ease, max-height 0.2s ease',
            }}
            variants={sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              // Distance or a decisive flick, so a short fast swipe closes too.
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* The drag surface: grip + title. touch-none keeps the browser from
                claiming the gesture as a scroll before framer-motion sees it. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            >
              <div className="flex flex-col items-center pt-2.5">
                <div className="h-1 w-9 rounded-full bg-parchment-300" />
              </div>
              {title != null && (
                <div className="px-5 pb-1 pt-3">
                  <h2 className="font-serif text-2xl text-ink-900">{title}</h2>
                </div>
              )}
            </div>

            {/* pb-safe keeps the last control clear of the home indicator. */}
            <div className="scroll-ios min-h-0 flex-1 overflow-y-auto pb-safe">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
