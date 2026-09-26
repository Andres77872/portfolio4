import { describe, expect, it } from 'vitest';

import {
  PROJECT_CATEGORIES,
  catalog,
  getFeaturedProjects,
  sortByNewest,
} from '@/components/Projects/catalog';
import { SITE_REPO_URL, profile } from '@/data/profile';

import { classifyHref } from './chatLinks';
import { buildSystemPrompt, getSystemMessage } from './systemPrompt';

const input = { profile, projects: catalog, categories: PROJECT_CATEGORIES };
const prompt = buildSystemPrompt(input);
const longest = [...catalog].sort((a, b) => b.descriptionMD.length - a.descriptionMD.length)[0];

describe('buildSystemPrompt', () => {
  it('lists every project under its slug and title', () => {
    for (const project of catalog) expect(prompt).toContain(`### ${project.slug} — ${project.title}`);
  });

  it('includes every live, source and API URL', () => {
    for (const project of catalog) {
      for (const url of [project.url, project.repoUrl, project.apiUrl]) {
        if (url) expect(prompt).toContain(url);
      }
    }
  });

  it('includes every contact link, including Hugging Face', () => {
    for (const link of profile.contactLinks) expect(prompt).toContain(link.url);
    expect(prompt).toContain('huggingface.co/Andres77872');
  });

  it('includes availability, location, timezone and the site repository', () => {
    expect(prompt).toContain(profile.availability);
    expect(prompt).toContain(profile.location);
    expect(prompt).toContain(profile.timezone);
    expect(prompt).toContain(SITE_REPO_URL);
  });

  it('marks only the featured projects, listing them first by rank and the rest newest first', () => {
    const featured = getFeaturedProjects(catalog);
    const featuredSlugs = new Set(featured.map((project) => project.slug));
    const expectedOrder = [
      ...featured,
      ...sortByNewest(catalog.filter((project) => !featuredSlugs.has(project.slug))),
    ].map((project) => project.slug);
    const actualOrder = Array.from(prompt.matchAll(/^### (\S+) — /gm), (match) => match[1]);

    expect(prompt.split('featured #').length - 1).toBe(featured.length);
    expect(actualOrder).toEqual(expectedOrder);
  });

  it('lists every category id from PROJECT_CATEGORIES', () => {
    for (const category of PROJECT_CATEGORIES) {
      expect(prompt).toContain(`- ${category.id}: ${category.label}. ${category.description}`);
    }
    expect(prompt).toContain(`(?category=${PROJECT_CATEGORIES[0].id})`);
  });

  it('leaves out images, raw write-ups and hype instructions', () => {
    expect(prompt).not.toContain('img.arz.ai');
    expect(prompt).not.toContain('image:');
    expect(prompt).not.toContain('**');
    expect(prompt).not.toMatch(/\bemoji\b/i);
    expect(prompt).not.toMatch(/enthusiastic/i);
    expect(prompt).toContain('No emojis');
  });

  // Budgets are per section so adding a project never fails the suite, while a bloated record or
  // rules block still does (the whole prompt is resent on every turn).
  it('keeps the rules/profile block and every project record within budget', () => {
    const projectsStart = prompt.indexOf('## PROJECTS');
    const records = prompt.slice(projectsStart).split(/\n(?=### )/).slice(1);

    expect(projectsStart).toBeLessThanOrEqual(5_500);
    expect(records).toHaveLength(catalog.length);
    for (const record of records) expect(record.length, record.slice(0, 60)).toBeLessThanOrEqual(900);
  });

  it('adds a CURRENT CONTEXT block for a known focus project within budget', () => {
    const focused = buildSystemPrompt({ ...input, focusSlug: longest.slug });

    expect(focused.length - prompt.length).toBeLessThanOrEqual(2_500);
    expect(focused).toContain('## CURRENT CONTEXT');
    expect(focused).toContain(`[${longest.title}](?project=${longest.slug})`);
    expect(focused.startsWith(prompt)).toBe(true);
    expect(focused).not.toContain('img.arz.ai');
  });

  // Every link form the rules teach must survive markdown parsing (no spaces) and classify as a
  // real in-page or external link, or the model is taught to write links that render as text.
  it('only teaches link forms that the chat can render and act on', () => {
    const rules = prompt.slice(prompt.indexOf('## RULES'), prompt.indexOf('## PROFILE'));
    const hrefs = Array.from(rules.matchAll(/\]\(([^)]*)\)/g), (match) => match[1]).filter(
      (href) => href !== 'slug' && !href.endsWith('=slug'),
    );

    expect(hrefs.length).toBeGreaterThan(4);
    for (const href of hrefs) {
      expect(href, href).not.toMatch(/\s/);
      expect(classifyHref(href).kind, href).not.toBe('text');
    }
  });

  it('ignores an unknown focus slug', () => {
    expect(buildSystemPrompt({ ...input, focusSlug: 'nope' })).toBe(prompt);
    expect(buildSystemPrompt({ ...input, focusSlug: null })).toBe(prompt);
  });

  it('is deterministic', () => {
    expect(buildSystemPrompt(input)).toBe(prompt);
  });
});

describe('getSystemMessage', () => {
  it('returns the site prompt as a system message', () => {
    expect(getSystemMessage(null)).toEqual({ role: 'system', content: prompt });
  });

  it('matches buildSystemPrompt for a focus project and ignores unknown slugs', () => {
    expect(getSystemMessage('findit').content).toBe(buildSystemPrompt({ ...input, focusSlug: 'findit' }));
    expect(getSystemMessage('nope').content).toBe(prompt);
  });
});
