import { describe, expect, it } from 'vitest';

import {
    PROJECT_CATEGORIES,
    catalog,
    filterProjects,
    findProjectBySlug,
    formatReleaseDate,
    getCategoryCounts,
    getFeaturedProjects,
    getPortfolioStats,
    getTechnologyUsage,
    isCategoryId,
    isFilterActive,
    slugify,
    sortByNewest,
    stripLeadingTitle,
    toCatalogProject,
} from './catalog';
import type { Project } from './types';

const project = (overrides: Partial<Project>): Project => ({
    title: 'Example',
    description: 'An example project.',
    descriptionMD: 'Example.',
    ...overrides,
});

const fixtures = [
    project({
        title: 'Alpha Search',
        tagline: 'Image search with embeddings',
        category: 'retrieval-vision',
        featured: 2,
        releaseDate: '2023-01-14',
        tags: ['REACT', 'QDRANT'],
        language: ['Python'],
        url: 'https://alpha.example',
    }),
    project({
        title: 'beta-agents',
        category: 'agents-llm',
        featured: 1,
        releaseDate: '2025-06-01',
        tags: ['LLM', 'react'],
        repoUrl: 'https://github.com/example/beta',
    }),
    project({
        title: 'Gamma Game',
        category: 'games-interactive',
        releaseDate: '2026-03-02',
        tags: ['THREE.JS'],
        url: 'https://gamma.example',
        repoUrl: 'https://github.com/example/gamma',
    }),
    project({ title: 'Undated', category: 'agents-llm', tags: ['LLM'] }),
].map(toCatalogProject);

const noFilter = { category: 'all' as const, query: '', technologies: [] };

describe('slugify', () => {
    it('produces URL-safe slugs from project titles', () => {
        expect(slugify('spyder.findit')).toBe('spyder-findit');
        expect(slugify('SmolVLM-500M-Anime-Caption')).toBe('smolvlm-500m-anime-caption');
        expect(slugify('Colpali-Arxiv Chat')).toBe('colpali-arxiv-chat');
        expect(slugify('  Café & Crème  ')).toBe('cafe-creme');
    });
});

describe('toCatalogProject', () => {
    it('derives slug, year and a deduplicated uppercase technology list', () => {
        const [alpha, beta] = fixtures;
        expect(alpha.slug).toBe('alpha-search');
        expect(alpha.year).toBe(2023);
        expect(alpha.technologies).toEqual(['REACT', 'QDRANT', 'PYTHON']);
        expect(beta.technologies).toEqual(['LLM', 'REACT']);
        expect(fixtures[3].year).toBeNull();
    });
});

describe('ordering helpers', () => {
    it('sorts newest first and sinks undated projects', () => {
        expect(sortByNewest(fixtures).map((p) => p.title)).toEqual([
            'Gamma Game',
            'beta-agents',
            'Alpha Search',
            'Undated',
        ]);
    });

    it('returns featured projects by rank', () => {
        expect(getFeaturedProjects(fixtures).map((p) => p.title)).toEqual(['beta-agents', 'Alpha Search']);
    });

    it('finds projects by slug', () => {
        expect(findProjectBySlug(fixtures, 'gamma-game')?.title).toBe('Gamma Game');
        expect(findProjectBySlug(fixtures, 'missing')).toBeNull();
        expect(findProjectBySlug(fixtures, null)).toBeNull();
    });
});

describe('filterProjects', () => {
    it('returns everything without filters', () => {
        expect(filterProjects(fixtures, noFilter)).toHaveLength(4);
        expect(isFilterActive(noFilter)).toBe(false);
    });

    it('filters by category', () => {
        const result = filterProjects(fixtures, { ...noFilter, category: 'agents-llm' });
        expect(result.map((p) => p.title)).toEqual(['beta-agents', 'Undated']);
    });

    it('requires every selected technology, including languages', () => {
        expect(filterProjects(fixtures, { ...noFilter, technologies: ['REACT'] })).toHaveLength(2);
        expect(filterProjects(fixtures, { ...noFilter, technologies: ['REACT', 'PYTHON'] }).map((p) => p.title))
            .toEqual(['Alpha Search']);
    });

    it('matches every query term across title, tagline, category and stack', () => {
        expect(filterProjects(fixtures, { ...noFilter, query: 'embeddings' }).map((p) => p.title))
            .toEqual(['Alpha Search']);
        expect(filterProjects(fixtures, { ...noFilter, query: 'three.js game' }).map((p) => p.title))
            .toEqual(['Gamma Game']);
        expect(filterProjects(fixtures, { ...noFilter, query: 'retrieval' }).map((p) => p.title))
            .toEqual(['Alpha Search']);
        expect(filterProjects(fixtures, { ...noFilter, query: 'nothing-matches' })).toEqual([]);
    });
});

describe('aggregates', () => {
    it('counts projects per category', () => {
        expect(getCategoryCounts(fixtures)).toEqual({
            all: 4,
            'retrieval-vision': 1,
            'agents-llm': 2,
            'platforms-tools': 0,
            'games-interactive': 1,
        });
    });

    it('ranks technologies by usage then name', () => {
        expect(getTechnologyUsage(fixtures).slice(0, 3)).toEqual([
            { name: 'LLM', count: 2 },
            { name: 'REACT', count: 2 },
            { name: 'PYTHON', count: 1 },
        ]);
    });

    it('summarizes the portfolio', () => {
        expect(getPortfolioStats(fixtures)).toEqual({
            total: 4,
            live: 2,
            openSource: 2,
            firstYear: 2023,
            latestYear: 2026,
        });
    });
});

describe('formatting', () => {
    it('formats release dates as short month and year', () => {
        expect(formatReleaseDate('2023-01-14')).toBe('Jan 2023');
        expect(formatReleaseDate('not a date')).toBe('not a date');
    });

    it('strips a leading bold heading that repeats the title', () => {
        expect(stripLeadingTitle('**FindIT: Reverse Search**\n\nBody text.', 'FindIT')).toBe('Body text.');
        expect(stripLeadingTitle('**Key Features:**\n* one', 'FindIT')).toBe('**Key Features:**\n* one');
        expect(stripLeadingTitle('Plain intro.', 'FindIT')).toBe('Plain intro.');
    });

    it('validates category ids', () => {
        expect(isCategoryId('agents-llm')).toBe(true);
        expect(isCategoryId('all')).toBe(false);
        expect(isCategoryId(null)).toBe(false);
    });
});

describe('bundled project data', () => {
    it('gives every project a known category, a tagline and a unique slug', () => {
        const categoryIds = PROJECT_CATEGORIES.map((category) => category.id);
        for (const entry of catalog) {
            expect(categoryIds, entry.title).toContain(entry.category);
            expect(entry.tagline, entry.title).toBeTruthy();
        }
        expect(new Set(catalog.map((entry) => entry.slug)).size).toBe(catalog.length);
    });

    it('gives featured projects unique ranks and highlights', () => {
        const featured = getFeaturedProjects(catalog);
        expect(featured.length).toBeGreaterThan(0);
        expect(new Set(featured.map((entry) => entry.featured)).size).toBe(featured.length);
        for (const entry of featured) expect(entry.highlights?.length, entry.title).toBeGreaterThan(0);
    });
});
