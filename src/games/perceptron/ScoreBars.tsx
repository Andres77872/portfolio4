import { cn } from '@/lib/utils';

interface Props {
  /** Ten values: raw scores (can be negative) or probabilities (0–1). */
  values: ArrayLike<number> | null;
  mode: 'score' | 'probability';
  predicted: number | null;
  /** The true digit, when known; highlighted if the prediction missed it. */
  label?: number | null;
  className?: string;
}

const DIGITS = Array.from({ length: 10 }, (_, digit) => digit);

/**
 * One column per output neuron. Probabilities grow from the baseline; raw perceptron
 * scores diverge from a zero line, so negative evidence is visible too.
 */
export default function ScoreBars({ values, mode, predicted, label = null, className }: Props) {
  let maxAbs = 0;
  if (values) for (let k = 0; k < 10; k += 1) maxAbs = Math.max(maxAbs, Math.abs(values[k]));
  const diverging = mode === 'score';
  const summary =
    values && predicted !== null
      ? `Predicted ${predicted}${mode === 'probability' ? ` with ${Math.round(values[predicted] * 100)}% probability` : ''}.`
      : 'No prediction yet.';

  return (
    <div className={cn('flex min-w-0 flex-col', className)} role="img" aria-label={summary}>
      <div className="relative flex min-h-0 flex-1 items-stretch gap-[3px]">
        {diverging && <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border" />}
        {DIGITS.map((digit) => {
          const value = values ? values[digit] : 0;
          const share = diverging ? (maxAbs === 0 ? 0 : Math.abs(value) / maxAbs) : Math.max(0, Math.min(1, value));
          const isPredicted = digit === predicted;
          const isMissedLabel = label !== null && digit === label && label !== predicted;
          const tone = isPredicted ? 'bg-primary' : isMissedLabel ? 'bg-success' : 'bg-muted-foreground/35';
          const style = diverging
            ? value >= 0
              ? { bottom: '50%', height: `${share * 50}%` }
              : { top: '50%', height: `${share * 50}%` }
            : { bottom: 0, height: `${share * 100}%` };

          return (
            <span key={digit} aria-hidden="true" className="relative flex-1 rounded-[2px] bg-foreground/[0.04]">
              <span
                className={cn('absolute inset-x-0 rounded-[2px] transition-[height] duration-100 motion-reduce:transition-none', tone)}
                style={style}
              />
            </span>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-[3px] font-mono text-[10px] leading-none">
        {DIGITS.map((digit) => (
          <span
            key={digit}
            className={cn(
              'flex-1 text-center tabular-nums',
              digit === predicted ? 'font-semibold text-primary' : digit === label ? 'font-semibold text-success' : 'text-muted-foreground',
            )}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}
