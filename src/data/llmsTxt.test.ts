import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifyHref } from '@/components/ChatBot/chatLinks';
import {
  PROJECT_CATEGORIES,
  catalog,
  getCategoryCounts,
  getFeaturedProjects,
  getPortfolioStats,
  getTechnologyUsage,
} from '@/components/Projects/catalog';
import { SITE_REPO_URL, profile } from '@/data/profile';

// public/llms.txt is served at https://arizmendi.io/llms.txt and doubles as the assistant agent's
// system prompt. It is written by hand, so these tests keep it in step with the data it describes.
const text = readFileSync(path.resolve(__dirname, '../../public/llms.txt'), 'utf8');

const SITE = { origin: 'https://arizmendi.io', pathname: '/' };
// The whole file is resent on every assistant turn. Budgets are per part, like systemPrompt.test.ts,
// so the project list can grow without failing the suite.
const MAX_PREAMBLE_CHARS = 10_000;
const MAX_PROJECT_ITEM_CHARS = 1_000;

// Same grammar as the reference parser (AnswerDotAI/llms-txt): the body splits on H2 headings,
// and every non-blank line in an H2 section must be a `- [title](url): notes` item.
const LINK_ITEM = /^-\s*\[(?<title>[^\]]+)\]\((?<url>[^)]+)\)(?::\s*(?<notes>.*))?$/;

interface LinkItem {
  title: string;
  url: string;
  notes: string;
}

const [preamble, ...parts] = text.split(/^##\s*(.*?)$/m);
const sections = new Map<string, string[]>();
for (let index = 0; index < parts.length; index += 2) {
  sections.set(parts[index].trim(), parts[index + 1].split('\n').filter((line) => line.trim()));
}

const itemsOf = (heading: string): LinkItem[] =>
  (sections.get(heading) ?? []).map((line) => {
    const groups = LINK_ITEM.exec(line)?.groups;
    if (!groups) throw new Error(`Not a link item under "${heading}": ${line}`);
    return { title: groups.title, url: groups.url, notes: groups.notes ?? '' };
  });

const projectItems = PROJECT_CATEGORIES.flatMap(({ label }) => itemsOf(label));
const docItems = itemsOf('Project documentation');
const projectUrl = (slug: string) => `${SITE.origin}/?project=${slug}`;

const urlsIn = (value: string): string[] => {
  const linked = [...value.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  const bare = [...value.matchAll(/(?<!\()https?:\/\/[^\s)<>`]+/g)].map((match) => match[0].replace(/[.,;:]+$/, ''));
  return [...new Set([...linked, ...bare])];
};

const originOf = (url: string) => new URL(url).origin;

// README sources are raw files of public GitHub repositories; returns the repository URL.
const RAW_README = /^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/refs\/heads\/[^/]+\/README\.md$/;
const readmeRepoOf = (url: string): string | null => {
  const match = RAW_README.exec(url);
  return match ? `https://github.com/${match[1]}` : null;
};

// Every external URL must come from the data (or be a checked documentation source), so a typo
// cannot slip past the origin allowlist.
const dataUrls = new Set(
  [
    ...catalog.flatMap((project) => [project.url, project.repoUrl, project.apiUrl, ...urlsIn(project.descriptionMD)]),
    ...profile.contactLinks.map((link) => link.url),
    SITE_REPO_URL,
    ...docItems.flatMap((item) => [item.url, ...urlsIn(item.notes)]),
  ].filter(Boolean),
);

describe('public/llms.txt', () => {
  it('follows the llms.txt layout: one H1, a one-line summary, then H2 link lists', () => {
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/^# \S/);
    expect(lines.filter((line) => /^# /.test(line))).toHaveLength(1);
    expect(lines.slice(1).find((line) => line.trim())).toMatch(/^> \S/);
    expect(preamble.split('\n').filter((line) => /^#{1,6}\s/.test(line))).toHaveLength(1);
    for (const heading of sections.keys()) expect(() => itemsOf(heading)).not.toThrow();
    expect([...sections.keys()].pop()).toBe('Optional');
  });

  it('carries a review date and fits the prompt budget', () => {
    expect(preamble).toMatch(/^Last reviewed: \d{4}-\d{2}-\d{2}\./m);
    expect(preamble.length).toBeLessThanOrEqual(MAX_PREAMBLE_CHARS);
    for (const item of projectItems) expect(item.notes.length, item.title).toBeLessThanOrEqual(MAX_PROJECT_ITEM_CHARS);
  });

  it('lists every project once, under its category, with rank, date and license', () => {
    for (const category of PROJECT_CATEGORIES) {
      const listed = itemsOf(category.label).map((item) => item.url).sort();
      const expected = catalog.filter((project) => project.category === category.id).map((project) => projectUrl(project.slug));
      expect(listed).toEqual(expected.sort());
    }

    for (const project of catalog) {
      const item = projectItems.find((entry) => entry.url === projectUrl(project.slug));
      expect(item?.title).toBe(project.title);
      const notes = item?.notes ?? '';
      const rank = typeof project.featured === 'number' ? `Featured #${project.featured} · ` : '';
      expect(notes.startsWith(`${rank}released ${project.releaseDate}`)).toBe(true);
      expect(notes.includes('Featured #')).toBe(Boolean(rank));
      if (project.license) expect(notes).toContain(project.license);
      for (const url of [project.url, project.repoUrl, project.apiUrl]) {
        if (url) expect(urlsIn(notes)).toContain(url);
      }
    }
  });

  it('states the featured order, site stats and filter counts the site shows', () => {
    expect(preamble).toContain(`featured order: ${getFeaturedProjects(catalog).map((project) => project.title).join(', ')}.`);

    const stats = getPortfolioStats(catalog);
    const summary = preamble.split('\n').find((line) => line.startsWith('> ')) ?? '';
    expect(summary).toContain(
      `${stats.total} projects released ${stats.firstYear}–${stats.latestYear} (${stats.live} with a live demo, ${stats.openSource} with a public repository)`,
    );

    const counts = getCategoryCounts(catalog);
    expect(itemsOf('Browse by category').map((item) => [item.url, item.notes.match(/\((\d+) projects\)\.$/)?.[1]])).toEqual(
      PROJECT_CATEGORIES.map((category) => [`${SITE.origin}/?category=${category.id}`, String(counts[category.id])]),
    );

    const technologies = getTechnologyUsage(catalog).filter((technology) => technology.count >= 2);
    expect(itemsOf('Browse by technology').map((item) => [item.url, item.notes])).toEqual(
      technologies.map(({ name, count }) => [`${SITE.origin}/?stack=${encodeURIComponent(name)}`, `${count} tagged projects.`]),
    );
  });

  it('lists documentation sources with unique IDs on their project\'s own domains', () => {
    // Each line is one `fetch_project_docs` source: `Source \`id\` for <project title>. …`
    const ids = docItems.map((item) => {
      const match = /^Source `([a-z0-9_]+)` for (.+?)\. /.exec(item.notes);
      expect(match, item.url).not.toBeNull();
      const project = catalog.find((entry) => entry.title === match?.[2]);
      expect(project, item.url).toBeDefined();
      const origins = [project?.url, project?.apiUrl, project?.repoUrl].filter((url): url is string => Boolean(url)).map(originOf);
      if (readmeRepoOf(item.url)) {
        expect(readmeRepoOf(item.url), item.url).toBe(project?.repoUrl);
      } else {
        expect(item.url).toMatch(/^https:\/\/[^\s]+\/llms\.txt$/);
        expect(origins, item.url).toContain(originOf(item.url));
      }
      for (const url of urlsIn(item.notes)) expect(origins, url).toContain(originOf(url));
      return match?.[1];
    });
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(preamble).toContain('`fetch_project_docs`');
  });

  it('gives every project without a live app or API its README as a source', () => {
    const readmeRepos = docItems.map((item) => readmeRepoOf(item.url));
    for (const project of catalog.filter((entry) => !entry.url && !entry.apiUrl)) {
      expect(readmeRepos, project.title).toContain(project.repoUrl);
    }
  });

  it('includes the profile, skills and every contact link', () => {
    for (const value of [profile.name, profile.title, profile.location, profile.timezone, profile.availability, SITE_REPO_URL]) {
      expect(text).toContain(value);
    }
    for (const item of profile.skills.flatMap((group) => group.items)) expect(text).toContain(item);
    const contactUrls = itemsOf('Contact').map((item) => item.url);
    for (const link of profile.contactLinks) expect(contactUrls).toContain(link.url);
  });

  it('only contains URLs from the data, each one a link the chat renders', () => {
    // The site root is the page the chat runs on, so the chat shows it as text; everything else must act.
    for (const url of urlsIn(text).filter((value) => value !== `${SITE.origin}/`)) {
      const sameSite = new URL(url).host === 'arizmendi.io';
      if (!sameSite) expect(dataUrls.has(url), url).toBe(true);
      // README sources are cited through the project's repository link (rule 16), not linked in the chat.
      if (readmeRepoOf(url)) continue;
      const expected = url.startsWith('mailto:') ? ['mailto'] : sameSite ? ['project', 'filter', 'section'] : ['external'];
      expect(expected, url).toContain(classifyHref(url, SITE).kind);
    }
  });
});
