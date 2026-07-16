/**
 * Shared Framer Motion presets. Every animated surface pulls from here so the
 * suite feels of a piece and honours reduced-motion (see MotionConfig in App).
 */
import type { Transition, Variants } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32 };
export const softSpring: Transition = { type: 'spring', stiffness: 240, damping: 30 };
export const ease: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

/** Page transitions in the shell. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

/** Bottom sheet slide-up. */
export const sheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: spring },
  exit: { y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

/** Modal scale-in. */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14 } },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

/** Staggered list entrance for cards/rows. */
export const listVariants: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: ease },
};
