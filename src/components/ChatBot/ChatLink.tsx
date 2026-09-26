import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { ArrowUpRight, ListFilter } from 'lucide-react';

import { catalog, filterProjects, getCategoryLabel } from '@/components/Projects/catalog';
import { handleProjectLinkClick, openProjectModal, showWork } from '@/components/Projects/projectLink';
import type { ProjectCategoryId } from '@/components/Projects/types';
import { scrollToSection } from '@/lib/scroll';
import { cn } from '@/lib/utils';

import { SITE_SECTIONS, classifyHref } from './chatLinks';
import { navigateFromChat, useChatNav } from './chatNavContext';
import { focusRing } from './styles';

const linkClasses = cn(
  'rounded-sm font-medium text-foreground underline decoration-primary/50 decoration-2 underline-offset-4 hover:decoration-primary',
  focusRing,
);

const describeFilter = (category: ProjectCategoryId | null, stack: readonly string[]): string => {
  const count = filterProjects(catalog, { category: category ?? 'all', query: '', technologies: stack }).length;
  const label = category ? getCategoryLabel(category) : undefined;
  const using = stack.length > 0 ? ` using ${stack.join(', ')}` : '';
  return label ? `Showing ${count} ${label} projects${using}.` : `Showing ${count} projects${using}.`;
};

/**
 * Links in assistant answers. Same-site links run in-page actions on a plain left click
 * (modified clicks fall through to the real href); external links survive only for
 * allowlisted origins; anything else renders as plain text.
 */
export default function ChatLink({ href, children }: { href?: string; children?: ReactNode }) {
  const nav = useChatNav();
  const target = useMemo(() => classifyHref(href), [href]);

  switch (target.kind) {
    case 'project': {
      const { project } = target;
      const onClick = (event: MouseEvent<HTMLAnchorElement>) =>
        handleProjectLinkClick(event, () => {
          openProjectModal(project.slug);
          nav.announce(`Opened ${project.title}.`);
        });
      return (
        <a href={target.href} onClick={onClick} className={linkClasses}>
          {children}
          <span className="sr-only"> (project details)</span>
        </a>
      );
    }

    case 'filter': {
      const { category, stack } = target;
      const onClick = (event: MouseEvent<HTMLAnchorElement>) =>
        handleProjectLinkClick(event, () =>
          navigateFromChat(
            nav,
            'projects',
            () => showWork({ category, stack: stack.length > 0 ? stack.join(',') : null }),
            describeFilter(category, stack),
          ),
        );
      return (
        <a href={target.href} onClick={onClick} className={linkClasses}>
          {children}
          <ListFilter aria-hidden className="ml-0.5 inline size-3" />
          <span className="sr-only"> (filters the project list)</span>
        </a>
      );
    }

    case 'section': {
      const { id } = target;
      const onClick = (event: MouseEvent<HTMLAnchorElement>) =>
        handleProjectLinkClick(event, () =>
          navigateFromChat(nav, id, () => scrollToSection(id), `Moved to ${SITE_SECTIONS[id]}.`),
        );
      return (
        <a href={target.href} onClick={onClick} className={linkClasses}>
          {children}
        </a>
      );
    }

    case 'external':
      return (
        <a href={target.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
          {children}
          <ArrowUpRight aria-hidden className="ml-0.5 inline size-3" />
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      );

    case 'mailto':
      return (
        <a href={target.href} className={linkClasses}>
          {children}
        </a>
      );

    default:
      return <span>{children}</span>;
  }
}
