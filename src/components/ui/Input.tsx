import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const fieldClass =
  'w-full rounded-card border-parchment-300 bg-parchment-50 text-ink-900 placeholder:text-ink-250 ' +
  'text-[15px] px-3.5 py-2.5 focus:border-teal-400 focus:ring-teal-400';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(fieldClass, error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, className, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      )}
      <textarea ref={ref} id={inputId} className={cn(fieldClass, 'resize-none', className)} {...props} />
    </div>
  );
});
