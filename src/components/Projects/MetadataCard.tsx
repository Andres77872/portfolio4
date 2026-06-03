import { cn } from '@/lib/utils';
import { ACCENT_COLORS, AccentColor } from './constants';

interface MetadataCardProps {
  icon: React.ReactNode;
  label: string;
  accentColor?: AccentColor;
  children: React.ReactNode;
}

/**
 * Metadata card component for displaying project metadata
 * Uses glassmorphism style with accent color highlights
 */
export function MetadataCard({
  icon,
  label,
  accentColor = 'indigo',
  children,
}: MetadataCardProps) {
  const colors = ACCENT_COLORS[accentColor];

  return (
    <div
      className={cn(
        'flex flex-col p-4 rounded-lg',
        'bg-muted/30 border border-border/50',
        'transition-all duration-200',
        'hover:bg-muted/50 hover:border-border'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn(colors.icon)}>{icon}</span>
        <span
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}