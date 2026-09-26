import { describe, expect, it } from 'vitest';

import { catalog, findProjectBySlug, getFeaturedProjects } from '@/components/Projects/catalog';
import type { CatalogProject } from '@/components/Projects/types';
import { profile } from '@/data/profile';

import { getProjectSuggestions, getWelcomeSuggestions } from './suggestions';

const EMOJI = /\p{Extended_Pictographic}/u;
const findit = findProjectBySlug(catalog, 'findit') as CatalogProject;

describe('getWelcomeSuggestions', () => {
  it('offers four chips, including the lead featured project', () => {
    const suggestions = getWelcomeSuggestions({ projects: catalog, profile, activeCategory: null });

    expect(suggestions.map(({ id }) => id)).toEqual(['tour', 'featured-1', 'open-source', 'availability']);
    expect(suggestions.map(({ label }) => label)).toContain(`How does ${getFeaturedProjects(catalog)[0].title} work?`);
    expect(suggestions[0]).toEqual({
      id: 'tour',
      label: 'Tour the featured work',
      prompt: "Give me a quick tour of Andres's featured projects.",
    });
  });

  it('drops the availability chip when availability is empty', () => {
    const suggestions = getWelcomeSuggestions({
      projects: catalog,
      profile: { ...profile, availability: '' },
      activeCategory: null,
    });

    expect(suggestions).toHaveLength(3);
    expect(suggestions.some(({ id }) => id === 'availability')).toBe(false);
  });

  it('swaps the tour chip for the active category', () => {
    const [tour] = getWelcomeSuggestions({ projects: catalog, profile, activeCategory: 'agents-llm' });

    expect(tour).toEqual({
      id: 'tour',
      label: 'Best of Agents & LLM Tooling',
      prompt: 'What are the standout projects in Agents & LLM Tooling?',
    });
  });
});

describe('getProjectSuggestions', () => {
  it('asks where to try a live project', () => {
    const suggestions = getProjectSuggestions({ ...findit, url: 'https://findit.moe/', repoUrl: undefined });

    expect(suggestions).toHaveLength(4);
    expect(suggestions[0]).toEqual({ id: 'problem', label: 'What problem does it solve?', prompt: 'What problem does FindIT solve?' });
    expect(suggestions[3]).toMatchObject({ label: 'Where can I try it?', prompt: 'Where can I try FindIT?' });
  });

  it('asks for the code when only a repository exists', () => {
    const suggestions = getProjectSuggestions({ ...findit, url: undefined, repoUrl: 'https://github.com/x/y' });

    expect(suggestions[3]).toMatchObject({ label: "Where's the code?", prompt: 'Where is the source code for FindIT?' });
  });

  it('omits the fourth chip without any link', () => {
    expect(getProjectSuggestions({ ...findit, url: undefined, repoUrl: undefined })).toHaveLength(3);
  });
});

describe('suggestion labels', () => {
  it('are short and emoji-free', () => {
    const labels = [
      ...getWelcomeSuggestions({ projects: catalog, profile, activeCategory: null }),
      ...(['retrieval-vision', 'agents-llm', 'platforms-tools', 'games-interactive'] as const).flatMap((activeCategory) =>
        getWelcomeSuggestions({ projects: catalog, profile, activeCategory }),
      ),
      ...catalog.flatMap(getProjectSuggestions),
    ].map(({ label }) => label);

    for (const label of labels) {
      expect(label.length).toBeLessThanOrEqual(32);
      expect(label).not.toMatch(EMOJI);
    }
  });
});
