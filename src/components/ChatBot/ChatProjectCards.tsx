import { memo } from 'react';
import { ArrowUpRight } from 'lucide-react';

import { catalog, findProjectBySlug, getCategoryLabel } from '@/components/Projects/catalog';
import { TechChip } from '@/components/Projects/ProjectMeta';
import { getProjectHref, handleProjectLinkClick, openProjectModal } from '@/components/Projects/projectLink';
import type { CatalogProject } from '@/components/Projects/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { focusRing, monoLabel, panelTextButton } from './styles';

function ProjectCard({ project }: { project: CatalogProject }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-background/40 p-3">
      {project.image && (
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-14 shrink-0 rounded-md border border-border object-cover max-xs:hidden"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className={monoLabel}>{[getCategoryLabel(project.category), project.year].filter(Boolean).join(' · ')}</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{project.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{project.tagline ?? project.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {project.technologies.slice(0, 3).map((technology) => (
            <TechChip key={technology} name={technology} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button asChild size="sm" variant="outline" className={cn(panelTextButton, focusRing)}>
            <a
              href={getProjectHref(project.slug)}
              onClick={(event) => handleProjectLinkClick(event, () => openProjectModal(project.slug))}
            >
              Open details<span className="sr-only">: {project.title}</span>
            </a>
          </Button>
          {project.url && (
            <Button asChild size="sm" variant="ghost" className={cn(panelTextButton, focusRing)}>
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                Live demo
                <ArrowUpRight className="size-3.5" />
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Catalog cards for the projects a completed answer links to (image and URLs never come from the model). */
function ChatProjectCards({ slugs }: { slugs: readonly string[] }) {
  const projects = slugs
    .map((slug) => findProjectBySlug(catalog, slug))
    .filter((project): project is CatalogProject => project !== null);
  if (projects.length === 0) return null;

  return (
    <ul aria-label="Projects in this answer" className="mt-3 grid gap-2">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </ul>
  );
}

export default memo(ChatProjectCards);
