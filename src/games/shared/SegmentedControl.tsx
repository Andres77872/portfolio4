import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/** A compact group of toggle buttons (one pressed at a time) for game settings. */
export default function SegmentedControl<T extends string>({ label, options, value, onChange, disabled, className }: Props<T>) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex rounded-md border border-border bg-muted/50 p-0.5', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-6 rounded-[5px] px-2 font-mono text-[11px] font-medium whitespace-nowrap transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
              selected ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
