import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/cn';

/**
 * The teal "add" button, floating over the bottom-right corner above the nav
 * bar. It sits clear of the tab bar's height plus the home indicator, so it
 * never covers a nav label or lands under the gesture area.
 *
 * Phone only: at md+ the side rail carries its own full "Add transaction"
 * button, so a floating duplicate would just be noise.
 */
export function Fab({ className }: { className?: string }) {
  const openAdd = useUIStore((s) => s.openAdd);
  return (
    <motion.button
      onClick={openAdd}
      whileTap={{ scale: 0.92 }}
      aria-label="Add transaction"
      className={cn(
        'fixed bottom-[calc(5rem+var(--safe-bottom))] right-[calc(1.25rem+var(--safe-right))] z-30',
        'grid h-14 w-14 place-items-center rounded-fab bg-teal-500 text-white shadow-lg',
        'hover:bg-teal-600 md:hidden',
        className
      )}
    >
      <Plus size={26} strokeWidth={2.5} />
    </motion.button>
  );
}
