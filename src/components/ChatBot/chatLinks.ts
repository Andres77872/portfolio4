import {
  catalog,
  findProjectBySlug,
  getTechnologyUsage,
  isCategoryId,
  slugify,
} from '@/components/Projects/catalog';
import { getProjectHref } from '@/components/Projects/projectLink';
import type { CatalogProject, ProjectCategoryId } from '@/components/Projects/types';
import { SITE_REPO_URL, profile } from '@/data/profile';

export type SiteSectionId = 'projects' | 'playground' | 'about' | 'contact';

export const SITE_SECTIONS: Record<SiteSectionId, string> = {
  projects: 'Work',
  playground: 'Playground',
  about: 'About',
  contact: 'Contact',
};

export type ChatLinkTarget =
  | { kind: 'project'; href: string; project: CatalogProject }
  | { kind: 'filter'; href: string; category: ProjectCategoryId | null; stack: string[] }
  | { kind: 'section'; href: string; id: SiteSectionId }
  | { kind: 'external'; href: string; host: string }
  | { kind: 'mailto'; href: string }
  | { kind: 'text' };

const SITE_HOST = 'arizmendi.io';
const TEXT: ChatLinkTarget = { kind: 'text' };

const toOrigin = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
};

/** Origins the assistant may link to: every catalog url/repoUrl/apiUrl, http(s) contact links and the site repo. */
export const KNOWN_LINK_ORIGINS: ReadonlySet<string> = new Set(
  [
    ...catalog.flatMap((project) => [project.url, project.repoUrl, project.apiUrl]),
    ...profile.contactLinks.map((link) => link.url),
    SITE_REPO_URL,
  ]
    .map(toOrigin)
    .filter((origin): origin is string => origin !== null),
);

const KNOWN_TECHNOLOGIES: ReadonlySet<string> = new Set(getTechnologyUsage(catalog).map(({ name }) => name));

const CONTACT_MAILTOS = new Map(
  profile.contactLinks
    .filter((link) => link.url.toLowerCase().startsWith('mailto:'))
    .map((link) => [link.url.toLowerCase(), link.url] as const),
);

const isSiteSection = (value: string): value is SiteSectionId =>
  Object.prototype.hasOwnProperty.call(SITE_SECTIONS, value);

const buildFilterHref = (category: ProjectCategoryId | null, stack: readonly string[]): string => {
  const params: string[] = [];
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (stack.length > 0) params.push(`stack=${stack.map(encodeURIComponent).join(',')}`);
  return `?${params.join('&')}`;
};

const parseStack = (value: string | null): string[] =>
  value
    ? Array.from(new Set(value.split(',').map((item) => item.trim().toUpperCase()))).filter((item) =>
        KNOWN_TECHNOLOGIES.has(item),
      )
    : [];

const currentLocation = (): { origin: string; pathname: string } =>
  typeof window === 'undefined'
    ? { origin: `https://${SITE_HOST}`, pathname: '/' }
    : { origin: window.location.origin, pathname: window.location.pathname };

const classifySameSite = (url: URL): ChatLinkTarget => {
  const params = url.searchParams;

  const projectParam = params.get('project');
  if (projectParam !== null) {
    const project = findProjectBySlug(catalog, slugify(projectParam));
    return project ? { kind: 'project', href: getProjectHref(project.slug), project } : TEXT;
  }

  const categoryParam = params.get('category');
  const stackParam = params.get('stack');
  if (categoryParam !== null || stackParam !== null) {
    const category = isCategoryId(categoryParam) ? categoryParam : null;
    const stack = parseStack(stackParam);
    if (!category && stack.length === 0) return TEXT;
    return { kind: 'filter', href: buildFilterHref(category, stack), category, stack };
  }

  let hash = '';
  try {
    hash = decodeURIComponent(url.hash.slice(1));
  } catch {
    return TEXT;
  }
  return isSiteSection(hash) ? { kind: 'section', href: `#${hash}`, id: hash } : TEXT;
};

/**
 * Decides what a link in an assistant answer may do. Same-site links become in-page
 * actions (project modal, filter, section); other links survive only if their origin is
 * allowlisted (or the mailto is a published contact link). Everything else renders as text.
 */
export function classifyHref(
  href: string | undefined,
  location: { origin: string; pathname: string } = currentLocation(),
): ChatLinkTarget {
  const value = href?.trim();
  if (!value) return TEXT;

  let url: URL;
  try {
    url = new URL(value, location.origin + location.pathname);
  } catch {
    return TEXT;
  }

  if (url.protocol === 'mailto:') {
    const contact = CONTACT_MAILTOS.get(value.toLowerCase());
    return contact ? { kind: 'mailto', href: contact } : TEXT;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return TEXT;

  const sameSite =
    (url.origin === location.origin || url.host === SITE_HOST) &&
    (url.pathname === '/' || url.pathname === location.pathname);
  if (sameSite) return classifySameSite(url);

  return KNOWN_LINK_ORIGINS.has(url.origin) ? { kind: 'external', href: url.href, host: url.host } : TEXT;
}

// Inline markdown links: optional "!" (images are skipped), [text](href "optional title").
const MARKDOWN_LINK = /(!?)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/** Project slugs linked with `[text](?project=slug)` style targets, in order of appearance, deduplicated. */
export function extractProjectSlugs(markdown: string): string[] {
  const slugs: string[] = [];
  const location = currentLocation();

  for (const match of markdown.matchAll(MARKDOWN_LINK)) {
    if (match[1] === '!') continue;
    const target = classifyHref(match[2], location);
    if (target.kind === 'project' && !slugs.includes(target.project.slug)) slugs.push(target.project.slug);
  }

  return slugs;
}
