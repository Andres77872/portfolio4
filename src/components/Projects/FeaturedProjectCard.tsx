import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from './catalog';
import { LanguageDots, ProjectLinks, ProjectStatusPill } from './ProjectMeta';
import { getProjectHref, handleProjectLinkClick } from './projectLink';
import type { CatalogProject } from './types';

interface FeaturedProjectCardProps {
  project: CatalogProject;
  onOpen: (project: CatalogProject) => void;
  /** `lead` renders the wide, side-by-side spotlight card. */
  variant?: 'lead' | 'default';
}

export default function FeaturedProjectCard({ project, onOpen, variant = 'default' }: FeaturedProjectCardProps) {
  const isLead = variant === 'lead';
  const category = getCategoryLabel(project.category);

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card',
        'transition-[border-color,box-shadow] duration-200 ease-out',
        'hover:border-primary/35 hover:shadow-xl hover:shadow-black/5',
        'has-[.project-card-link:focus-visible]:ring-2 has-[.project-card-link:focus-visible]:ring-ring',
        isLead ? 'grid md:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : 'flex flex-col',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          isLead ? 'aspect-[16/10] md:aspect-auto md:min-h-[400px] lg:min-h-[440px]' : 'aspect-[16/9]',
        )}
      >
        {project.image && (
          <img
            src={project.image}
            alt=""
            loading={isLead ? 'eager' : 'lazy'}
            decoding="async"
            className={cn(
              'absolute inset-0 size-full object-cover object-[center_28%]',
              'transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none',
            )}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <ProjectStatusPill project={project} className="absolute left-4 top-4" />
      </div>

      <div className={cn('flex flex-1 flex-col gap-4', isLead ? 'p-8 max-md:p-6' : 'p-6 max-xs:p-5')}>
        <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
          <span className="text-primary">Featured</span>
          {[category, project.year].filter(Boolean).map((part) => ` · ${part}`)}
        </p>

        <div className="flex flex-col gap-2">
          <h3
            className={cn(
              'font-semibold leading-tight tracking-tight text-foreground',
              isLead ? 'text-[clamp(1.75rem,3vw,2.25rem)]' : 'text-xl',
            )}
          >
            <a
              href={getProjectHref(project.slug)}
              onClick={(event) => handleProjectLinkClick(event, () => onOpen(project))}
              className="project-card-link outline-none transition-colors group-hover:text-primary after:absolute after:inset-0 after:content-['']"
            >
              {project.title}
            </a>
          </h3>
          <p className={cn('text-pretty leading-relaxed text-muted-foreground', isLead ? 'text-lg' : 'text-sm')}>
            {project.tagline ?? project.description}
          </p>
        </div>

        {project.highlights && project.highlights.length > 0 && (
          <ul className={cn('flex flex-col gap-2', isLead ? 'text-[0.9375rem]' : 'text-sm max-sm:hidden')}>
            {project.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2.5 text-foreground/85">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        <LanguageDots languages={project.language} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <ProjectLinks project={project} variant="full" />
          <span
            aria-hidden="true"
            className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary"
          >
            Details →
          </span>
        </div>
      </div>
    </article>
  );
}
