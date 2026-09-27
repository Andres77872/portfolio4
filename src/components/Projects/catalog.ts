import projectsData from '@/data/projects.json';
import { resolveProjectImage } from '@/config/projectImages';
import type { CatalogProject, Project, ProjectCategoryId } from './types';

export interface ProjectCategory {
    id: ProjectCategoryId;
    label: string;
    description: string;
}

export const PROJECT_CATEGORIES: readonly ProjectCategory[] = [
    {
        id: 'retrieval-vision',
        label: 'Retrieval & Vision',
        description: 'Search engines, RAG pipelines and vision-language models.',
    },
    {
        id: 'agents-llm',
        label: 'Agents & LLM Tooling',
        description: 'Agent frameworks, provider wrappers and generative apps.',
    },
    {
        id: 'platforms-tools',
        label: 'Platforms & Tools',
        description: 'Authentication, secure file sharing and developer tooling.',
    },
    {
        id: 'games-interactive',
        label: 'Games & Interactive',
        description: 'WebGL games, canvas experiments and this site.',
    },
];

export type CategoryFilter = ProjectCategoryId | 'all';

const CATEGORY_IDS = new Set<string>(PROJECT_CATEGORIES.map((category) => category.id));

export const isCategoryId = (value: string | null | undefined): value is ProjectCategoryId =>
    typeof value === 'string' && CATEGORY_IDS.has(value);

export const getCategoryLabel = (id: ProjectCategoryId | undefined): string | undefined =>
    PROJECT_CATEGORIES.find((category) => category.id === id)?.label;

/** URL-safe identifier: "spyder.findit" → "spyder-findit". */
export const slugify = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s._-]/g, '')
        .replace(/[\s._-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const normalizeTechnology = (value: string) => value.trim().toUpperCase();

export const toCatalogProject = (project: Project): CatalogProject => {
    const year = project.releaseDate ? Number.parseInt(project.releaseDate.slice(0, 4), 10) : Number.NaN;
    const slug = slugify(project.title);

    return {
        ...project,
        slug,
        image: resolveProjectImage(slug, project.image),
        year: Number.isFinite(year) ? year : null,
        technologies: Array.from(
            new Set([...(project.tags ?? []), ...(project.language ?? [])].map(normalizeTechnology)),
        ),
    };
};

export const catalog: CatalogProject[] = (projectsData as Project[]).map(toCatalogProject);

export const findProjectBySlug = (
    projects: readonly CatalogProject[],
    slug: string | null | undefined,
): CatalogProject | null => (slug ? projects.find((project) => project.slug === slug) ?? null : null);

/** Newest first; undated projects sink to the end; ties break by title. */
export const sortByNewest = (projects: readonly CatalogProject[]): CatalogProject[] =>
    [...projects].sort((a, b) => {
        const dateA = a.releaseDate ?? '';
        const dateB = b.releaseDate ?? '';
        if (dateA !== dateB) return dateA < dateB ? 1 : -1;
        return a.title.localeCompare(b.title);
    });

export const getFeaturedProjects = (projects: readonly CatalogProject[]): CatalogProject[] =>
    projects
        .filter((project) => typeof project.featured === 'number')
        .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0));

export interface ProjectFilter {
    category: CategoryFilter;
    query: string;
    /** Uppercased technologies; a project must use every one of them. */
    technologies: readonly string[];
}

export const isFilterActive = ({ category, query, technologies }: ProjectFilter): boolean =>
    category !== 'all' || query.trim() !== '' || technologies.length > 0;

/** Every whitespace-separated term must appear in the project's searchable text. */
export const matchesQuery = (project: CatalogProject, query: string): boolean => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return true;

    const haystack = [
        project.title,
        project.tagline,
        project.description,
        getCategoryLabel(project.category),
        ...project.technologies,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return terms.every((term) => haystack.includes(term));
};

export const filterProjects = (
    projects: readonly CatalogProject[],
    { category, query, technologies }: ProjectFilter,
): CatalogProject[] =>
    projects.filter(
        (project) =>
            (category === 'all' || project.category === category) &&
            technologies.every((technology) => project.technologies.includes(technology)) &&
            matchesQuery(project, query),
    );

export const getCategoryCounts = (projects: readonly CatalogProject[]): Record<CategoryFilter, number> => {
    const counts = { all: projects.length } as Record<CategoryFilter, number>;
    for (const { id } of PROJECT_CATEGORIES) counts[id] = 0;
    for (const project of projects) {
        if (project.category) counts[project.category] += 1;
    }
    return counts;
};

export interface TechnologyUsage {
    name: string;
    count: number;
}

/** Technologies ordered by how many projects use them, then alphabetically. */
export const getTechnologyUsage = (projects: readonly CatalogProject[]): TechnologyUsage[] => {
    const counts = new Map<string, number>();
    for (const project of projects) {
        for (const technology of project.technologies) {
            counts.set(technology, (counts.get(technology) ?? 0) + 1);
        }
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
};

export interface PortfolioStats {
    total: number;
    live: number;
    openSource: number;
    firstYear: number | null;
    latestYear: number | null;
}

export const getPortfolioStats = (projects: readonly CatalogProject[]): PortfolioStats => {
    const years = projects.map((project) => project.year).filter((year): year is number => year !== null);

    return {
        total: projects.length,
        live: projects.filter((project) => Boolean(project.url)).length,
        openSource: projects.filter((project) => Boolean(project.repoUrl)).length,
        firstYear: years.length ? Math.min(...years) : null,
        latestYear: years.length ? Math.max(...years) : null,
    };
};

const releaseDateFormatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "2023-01-14" → "Jan 2023". Returns the input unchanged if it is not a date. */
export const formatReleaseDate = (value: string): string => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : releaseDateFormatter.format(date);
};

/**
 * Drops a leading bold heading line such as "**FindIT: Advanced Reverse Image Search**"
 * when it repeats the project title the modal already shows.
 */
export const stripLeadingTitle = (markdown: string, title: string): string => {
    const match = /^\s*\*\*([^*\n]+)\*\*\s*(?:\n|$)/.exec(markdown);
    if (!match || !match[1].toLowerCase().includes(title.toLowerCase())) return markdown;
    return markdown.slice(match[0].length).trimStart();
};
