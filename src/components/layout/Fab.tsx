import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';

/** Prominent teal "add" FAB — the centre of the bottom nav (mockup .nav .fab). */
export function Fab({ className }: { className?: string }) {
  const openAdd = useUIStore((s) => s.openAdd);
  return (
    <motion.button
      onClick={openAdd}
      whileTap={{ scale: 0.92 }}
      aria-label="Add transaction"
      className={
        'grid h-14 w-14 -translate-y-3.5 place-items-center rounded-fab bg-teal-500 text-white shadow-lg ' +
        'hover:bg-teal-600 ' +
        (className ?? '')
      }
    >
      <Plus size={26} strokeWidth={2.5} />
    </motion.button>
  );
}
