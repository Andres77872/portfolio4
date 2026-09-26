import type { MouseEvent } from 'react';
import { writeSearchParams } from '@/hooks/useSearchParam';
import { scrollToSection } from '@/lib/scroll';
import type { ProjectCategoryId } from './types';

export const PROJECT_MODAL_HISTORY_STATE = { projectModal: true } as const;

export const getProjectHref = (slug: string) => `?project=${encodeURIComponent(slug)}`;

/** Opens the project modal from anywhere on the page; Back closes it. */
export const openProjectModal = (slug: string) =>
  writeSearchParams({ project: slug }, { mode: 'push', state: PROJECT_MODAL_HISTORY_STATE });

/**
 * Plain left-clicks open the in-page modal; modified clicks (new tab, new window)
 * fall through to the real `?project=` URL so deep links keep working.
 */
export const handleProjectLinkClick = (event: MouseEvent<HTMLAnchorElement>, open: () => void) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  open();
};

export interface ShowWorkFilters {
  category?: ProjectCategoryId | null;
  /** Comma-separated, uppercased technologies, as in `?stack=`. */
  stack?: string | null;
}

/** Fired by showWork so Projects can drop its free-text search, which lives in local state, not the URL. */
export const SHOW_WORK_EVENT = 'portfolio:show-work';

/**
 * Replaces the project filters (closing any open project and clearing the search box) and scrolls
 * to Work, like Projects' "show projects using".
 */
export const showWork = (filters: ShowWorkFilters = {}) => {
  writeSearchParams({ project: null, category: null, stack: null, ...filters }, { state: null });
  window.dispatchEvent(new Event(SHOW_WORK_EVENT));
  scrollToSection('projects');
};
