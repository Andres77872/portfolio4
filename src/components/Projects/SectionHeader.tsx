interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

/**
 * Section header with icon and title
 */
export function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}