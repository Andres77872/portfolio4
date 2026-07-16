import { cn } from '@/lib/utils';

interface MetadataCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

/**
 * Metadata card component for displaying project metadata
 */
export function MetadataCard({ icon, label, children }: MetadataCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col p-4 rounded-lg',
        'bg-muted/30 border border-border/50',
        'transition-colors duration-200',
        'hover:bg-muted/50 hover:border-border'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
