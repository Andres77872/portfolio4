import { cn } from '@/lib/utils';
import { STATUS_CONFIG, ProjectStatus } from './constants';

interface StatusBadgeProps {
  status: ProjectStatus;
}

/**
 * Status badge displayed on hero section
 * Shows production/repository status with animated indicator
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isProduction = status === 'production';

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-[3]',
        'flex items-center gap-2',
        'px-3 py-1.5 rounded-full',
        'text-xs font-medium tracking-wide',
        'bg-background/80 backdrop-blur-md',
        'border border-border/50 shadow-sm',
        isProduction
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-indigo-600 dark:text-indigo-400'
      )}
    >
      <span className={cn('relative w-2 h-2 rounded-full', isProduction ? 'bg-emerald-500' : 'bg-indigo-500')}>
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            isProduction ? 'bg-emerald-500/40' : 'bg-indigo-500/40'
          )}
        />
      </span>
      {config.label}
    </div>
  );
}