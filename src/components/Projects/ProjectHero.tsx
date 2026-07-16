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
      {/* Subtle gradient so the sticky header blends into the image */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-t from-background/80 via-transparent to-transparent'
        )}
      />

      {/* Status Badge */}
      {project.status && <StatusBadge status={project.status} />}
    </div>
  );
}