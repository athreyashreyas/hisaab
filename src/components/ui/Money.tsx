import { formatINR } from '../../lib/calculations';
import { cn } from '../../lib/cn';

/**
 * Hisaab's signature: money set in the serif display face so figures read like a
 * hand-kept ledger. The paise are rendered a touch smaller and dimmer, as in the
 * dashboard mockup's hero. Always tabular so columns of rupees line up.
 */
export function Money({
  paise,
  showPaise = false,
  className,
  paiseClassName,
  sign,
  style,
}: {
  paise: number;
  showPaise?: boolean;
  className?: string;
  paiseClassName?: string;
  /** Force a leading + / − (income vs expense). Omit for plain magnitude. */
  sign?: '+' | '-' | null;
  style?: React.CSSProperties;
}) {
  const whole = formatINR(Math.abs(paise), false); // "₹18,420"
  const paiseStr = showPaise ? `.${String(Math.abs(paise) % 100).padStart(2, '0')}` : '';
  return (
    <span className={cn('font-serif tabular-nums', className)} style={style}>
      {sign ? <span>{sign}</span> : null}
      {whole}
      {paiseStr && <span className={cn('opacity-60', paiseClassName)}>{paiseStr}</span>}
    </span>
  );
}
