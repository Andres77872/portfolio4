import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import artwork from '@/data/projectArtwork.json';
import projects from '@/data/projects.json';
import type { Project } from '@/components/Projects/types';
import { resolveProjectImage } from './projectImages';

afterEach(() => vi.unstubAllEnvs());

describe('project artwork selection', () => {
  const legacy = 'https://example.com/original.jpg';

  it.each([undefined, 'legacy', '', 'true', 'invalid'])(
    'preserves original artwork for %s mode',
    (mode) => {
      expect(resolveProjectImage('findit', legacy, { VITE_PROJECT_IMAGES: mode })).toBe(legacy);
    },
  );

  it.each(['1', '2', '3', '4', '5', '6', '7', '8', '9'])('selects generated set %s under the deployment base', (variant) => {
    expect(resolveProjectImage('findit', legacy, {
      VITE_PROJECT_IMAGES: 'generated',
      VITE_PROJECT_IMAGE_VARIANT: variant,
      BASE_URL: '/portfolio/',
    })).toBe(`/portfolio/images/projects/findit/${variant}.webp`);
  });

  it.each([undefined, 'invalid'])('uses character-free set 7 for variant %s and falls back for uncommissioned projects', (variant) => {
    const env = { VITE_PROJECT_IMAGES: 'generated', VITE_PROJECT_IMAGE_VARIANT: variant };
    expect(resolveProjectImage('findit', legacy, env)).toBe('/images/projects/findit/7.webp');
    expect(resolveProjectImage('future-project', legacy, env)).toBe(legacy);
    expect(resolveProjectImage('future-project', undefined, env)).toBeUndefined();
  });

  it.each(['0', '-1', '1.5', '999', '', 'NaN'])('falls back to set 7 for variant %s', (variant) => {
    expect(resolveProjectImage('findit', legacy, {
      VITE_PROJECT_IMAGES: 'generated',
      VITE_PROJECT_IMAGE_VARIANT: variant,
    })).toBe('/images/projects/findit/7.webp');
  });

  it('switches the shared catalog without changing the original project data', async () => {
    const { toCatalogProject } = await import('@/components/Projects/catalog');
    const project = projects.find((entry) => entry.title === 'FindIT')! as Project;
    vi.stubEnv('VITE_PROJECT_IMAGES', 'generated');
    vi.stubEnv('VITE_PROJECT_IMAGE_VARIANT', '7');
    expect(toCatalogProject(project).image).toBe('/images/projects/findit/7.webp');
    vi.stubEnv('VITE_PROJECT_IMAGES', 'legacy');
    expect(toCatalogProject(project).image).toBe(project.image);
    expect(project.image).toMatch(/^https:\/\//);
  });

  it('ships nine distinct, valid WebP assets for every catalog project', async () => {
    const { slugify } = await import('@/components/Projects/catalog');
    expect(Object.keys(artwork).sort()).toEqual(projects.map((project) => slugify(project.title)).sort());
    for (const images of Object.values(artwork)) {
      expect(images).toHaveLength(9);
      expect(new Set(images).size).toBe(9);
      const contents = images.map((image) => {
        const file = path.resolve('public', image);
        expect(existsSync(file), image).toBe(true);
        const bytes = readFileSync(file);
        expect(bytes.toString('ascii', 0, 4), image).toBe('RIFF');
        expect(bytes.toString('ascii', 8, 12), image).toBe('WEBP');
        return createHash('sha256').update(bytes).digest('hex');
      });
      expect(new Set(contents).size).toBe(images.length);
    }
  });
});
