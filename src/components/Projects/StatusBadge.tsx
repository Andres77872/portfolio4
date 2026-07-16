import { cn } from '@/lib/utils';
import { ProjectStatus } from './constants';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

/**
 * Project status pill shown over project imagery.
 * Production projects use the success token, repositories the primary token.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
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
        isProduction ? 'text-success' : 'text-primary',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isProduction ? 'bg-success' : 'bg-primary'
        )}
      />
      {isProduction ? 'Live' : 'Repo'}
    </div>
  );
}
