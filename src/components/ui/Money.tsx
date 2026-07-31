import { formatINR, hasPaise } from '../../lib/money';
import { cn } from '../../lib/cn';

/**
 * Hisaab's signature: money set in the serif display face so figures read like a
 * hand-kept ledger. The paise are rendered a touch smaller and dimmer, as in the
 * dashboard mockup's hero. Always tabular so columns of rupees line up.
 *
 * `showPaise` defaults to 'auto': paise appear only when the amount has any, so
 * ₹1,240.50 reads in full while ₹1,240 stays clean. The rupee part is floored
 * rather than formatted from the full figure — rounding it first turned
 * ₹1,240.50 into "₹1,241.50".
 */
export function Money({
  paise,
  showPaise = 'auto',
  className,
  paiseClassName,
  sign,
  style,
}: {
  paise: number;
  showPaise?: boolean | 'auto';
  className?: string;
  paiseClassName?: string;
  /** Force a leading + / − (income vs expense). Omit for plain magnitude. */
  sign?: '+' | '-' | null;
  style?: React.CSSProperties;
}) {
  const abs = Math.abs(Math.round(paise));
  const withPaise = showPaise === 'auto' ? hasPaise(abs) : showPaise;
  const whole = formatINR(Math.floor(abs / 100) * 100, false); // "₹18,420"
  const paiseStr = withPaise ? `.${String(abs % 100).padStart(2, '0')}` : '';
  return (
    <span className={cn('font-serif tabular-nums', className)} style={style}>
      {sign ? <span>{sign}</span> : null}
      {whole}
      {paiseStr && <span className={cn('opacity-60', paiseClassName)}>{paiseStr}</span>}
    </span>
  );
}
