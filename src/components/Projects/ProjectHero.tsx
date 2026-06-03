import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { Project } from './types';

interface ProjectHeroProps {
  project: Project;
}

/**
 * Hero section with project image and status badge
 */
export function ProjectHero({ project }: ProjectHeroProps) {
  if (!project.image) return null;

  return (
    <div className="relative aspect-[21/9] overflow-hidden bg-muted/30">
      <img
        src={project.image}
        alt={project.title}
        className="w-full h-full object-cover"
      />
      {/* Multi-layer gradient overlay */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-t from-background via-background/60 to-transparent'
        )}
      />
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-r from-background/40 via-transparent to-background/40'
        )}
      />

      {/* Status Badge */}
      {project.status && <StatusBadge status={project.status} />}
    </div>
  );
}