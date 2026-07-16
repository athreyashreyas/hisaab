import { icons, type LucideProps } from 'lucide-react';

/**
 * Render a lucide icon by its kebab-case name (as stored on categories/goals).
 * Falls back to a neutral dot if the name is unknown, so a bad icon string never
 * crashes a row.
 */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const key = toPascal(name);
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[key] ?? icons.Circle;
  return <Cmp {...props} />;
}

function toPascal(kebab: string): string {
  return kebab
    .split(/[-_ ]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}
