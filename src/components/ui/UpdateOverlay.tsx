import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';

/**
 * Full-screen veil shown for the beat between "new version detected" and the
 * controlled reload (see main.tsx). Listens for the `hisaab:updating` event the
 * SW handler dispatches — same silent-update pattern as Attend and Harmony.
 */
export function UpdateOverlay() {
  const { updating, setUpdating } = useUIStore();

  useEffect(() => {
    const on = () => setUpdating(true);
    window.addEventListener('hisaab:updating', on);
    return () => window.removeEventListener('hisaab:updating', on);
  }, [setUpdating]);

  return (
    <AnimatePresence>
      {updating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-parchment-100/90 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-teal-500 animate-pulse-dot" />
            <p className="font-serif text-xl text-ink-900">Freshening up…</p>
            <p className="text-sm text-ink-500">Hisaab is updating to the latest version.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
