import { useEffect, useState } from 'react';

const MD = 768; // Tailwind md breakpoint — bottom nav below, side rail at/above.

/** True at md+ (side rail); false on phones (bottom nav + FAB). */
export function useViewport(): { isDesktop: boolean; width: number } {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? MD : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { isDesktop: width >= MD, width };
}
