import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthBadgeProps {
  active: boolean;
  label: string;
}

/**
 * Authentication badge showing enabled/disabled status
 */
export function AuthBadge({ active, label }: AuthBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
        'transition-colors duration-150',
        active
          ? 'bg-success/15 text-success border border-success/25'
          : 'bg-muted/50 text-muted-foreground border border-border'
      )}
    >
      {active ? (
        <Check className="w-3 h-3" />
      ) : (
        <X className="w-3 h-3" />
      )}
      {label}
    </span>
  );
}