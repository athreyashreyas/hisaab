import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-card transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] transition-transform';

const variants: Record<Variant, string> = {
  primary: 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm',
  secondary: 'bg-parchment-200 text-ink-900 hover:bg-parchment-300',
  ghost: 'text-ink-700 hover:bg-parchment-200',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-[15px] px-4 py-2.5',
  lg: 'text-base px-5 py-3.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...props}
    />
  );
});
