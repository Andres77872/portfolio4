import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from './catalog';
import { ProjectLinks, ProjectStatusPill, TechChip } from './ProjectMeta';
import { getProjectHref, handleProjectLinkClick } from './projectLink';
import type { CatalogProject } from './types';

const VISIBLE_TECH_COUNT = 4;

interface ProjectCardProps {
  project: CatalogProject;
  onOpen: (project: CatalogProject) => void;
  selectedTechnologies?: readonly string[];
  index?: number;
}

export default function ProjectCard({ project, onOpen, selectedTechnologies = [], index = 0 }: ProjectCardProps) {
  // Surface the technologies the visitor filtered by before the rest.
  const technologies = [...project.technologies].sort(
    (a, b) => Number(selectedTechnologies.includes(b)) - Number(selectedTechnologies.includes(a)),
  );
  const visible = technologies.slice(0, VISIBLE_TECH_COUNT);
  const hiddenCount = technologies.length - visible.length;
  const category = getCategoryLabel(project.category);

  return (
    <article
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card',
        'transition-[transform,border-color,box-shadow] duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5',
        'has-[.project-card-link:focus-visible]:ring-2 has-[.project-card-link:focus-visible]:ring-ring',
        'animate-fade-in-up motion-reduce:animate-none motion-reduce:hover:translate-y-0',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` } as CSSProperties}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {project.image && (
          <img
            src={project.image}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              'size-full object-cover object-[center_30%]',
              'transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none',
            )}
          />
        )}
        <ProjectStatusPill project={project} className="absolute left-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5 max-xs:p-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
          {[category, project.year].filter(Boolean).join(' · ')}
        </p>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
          <a
            href={getProjectHref(project.slug)}
            onClick={(event) => handleProjectLinkClick(event, () => onOpen(project))}
            className={cn(
              'project-card-link outline-none transition-colors group-hover:text-primary',
              'after:absolute after:inset-0 after:content-[""]',
            )}
          >
            {project.title}
          </a>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.tagline ?? project.description}
        </p>

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-3" aria-label="Technologies">
          {visible.map((technology) => (
            <li key={technology}>
              <TechChip name={technology} selected={selectedTechnologies.includes(technology)} />
            </li>
          ))}
          {hiddenCount > 0 && (
            <li>
              <TechChip name={`+${hiddenCount}`} className="border-transparent bg-transparent" />
            </li>
          )}
        </ul>
      </div>

      <div className="flex min-h-12 items-center justify-between gap-2 border-t border-border px-5 py-2 max-xs:px-4">
        <ProjectLinks project={project} />
        <span aria-hidden="true" className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
          Details →
        </span>
      </div>
    </article>
  );
}
