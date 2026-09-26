import { describe, expect, it } from 'vitest';

import { catalog } from '@/components/Projects/catalog';
import { profile } from '@/data/profile';

import { KNOWN_LINK_ORIGINS, SITE_SECTIONS, classifyHref, extractProjectSlugs } from './chatLinks';

const here = { origin: 'http://localhost:5188', pathname: '/' };
const classify = (href: string | undefined) => classifyHref(href, here);

describe('classifyHref', () => {
  it.each(['?project=findit', '/?project=FindIT', 'https://arizmendi.io/?project=findit'])(
    'treats %s as the FindIT project',
    (href) => {
      expect(classify(href)).toMatchObject({ kind: 'project', href: '?project=findit', project: { slug: 'findit' } });
    },
  );

  it('rejects unknown project slugs', () => {
    expect(classify('?project=nope')).toEqual({ kind: 'text' });
  });

  it('accepts known categories only', () => {
    expect(classify('?category=agents-llm')).toEqual({
      kind: 'filter',
      href: '?category=agents-llm',
      category: 'agents-llm',
      stack: [],
    });
    expect(classify('?category=bogus')).toEqual({ kind: 'text' });
  });

  it('normalizes and filters stack technologies', () => {
    expect(classify('?stack=qdrant')).toMatchObject({ kind: 'filter', category: null, stack: ['QDRANT'], href: '?stack=QDRANT' });
    expect(classify('?stack=QDRANT,COBOL')).toMatchObject({ kind: 'filter', stack: ['QDRANT'] });
    expect(classify('?stack=COBOL')).toEqual({ kind: 'text' });
  });

  it('accepts multi-word technologies encoded as %20 or +', () => {
    expect(classify('?stack=AWS%20BEDROCK')).toMatchObject({ kind: 'filter', stack: ['AWS BEDROCK'] });
    expect(classify('?stack=aws+bedrock')).toMatchObject({ kind: 'filter', stack: ['AWS BEDROCK'] });
  });

  it('combines a category and a stack', () => {
    expect(classify('?category=agents-llm&stack=PYTHON')).toEqual({
      kind: 'filter',
      href: '?category=agents-llm&stack=PYTHON',
      category: 'agents-llm',
      stack: ['PYTHON'],
    });
  });

  it('gives the project parameter precedence over filters', () => {
    expect(classify('?project=findit&category=agents-llm')).toMatchObject({ kind: 'project' });
  });

  it('accepts known page sections only', () => {
    expect(classify('#contact')).toEqual({ kind: 'section', href: '#contact', id: 'contact' });
    expect(classify('#nope')).toEqual({ kind: 'text' });
    for (const id of Object.keys(SITE_SECTIONS)) expect(classify(`#${id}`)).toMatchObject({ kind: 'section', id });
  });

  it('allows external links on allowlisted origins', () => {
    expect(classify('https://findit.moe/')).toEqual({ kind: 'external', href: 'https://findit.moe/', host: 'findit.moe' });
    expect(classify('https://huggingface.co/Andres77872/SmolVLM-500M-anime-caption-v0.2')).toMatchObject({
      kind: 'external',
      host: 'huggingface.co',
    });
  });

  it('renders anything off the allowlist as text', () => {
    expect(classify('https://evil.example/p.png')).toEqual({ kind: 'text' });
    expect(classify('https://evil.example/?project=findit')).toEqual({ kind: 'text' });
    expect(classify('//evil.example/')).toEqual({ kind: 'text' });
    expect(classify('/somewhere-else')).toEqual({ kind: 'text' });
  });

  it('accepts only published mailto contacts', () => {
    expect(classify('mailto:andres@arz.ai')).toEqual({ kind: 'mailto', href: 'mailto:andres@arz.ai' });
    expect(classify('mailto:x@y.z')).toEqual({ kind: 'text' });
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', '', '   ', undefined])('renders %j as text', (href) => {
    expect(classify(href)).toEqual({ kind: 'text' });
  });

  it('defaults to the current page location', () => {
    expect(classifyHref('?project=findit')).toMatchObject({ kind: 'project' });
    expect(classifyHref(`${window.location.origin}/#about`)).toMatchObject({ kind: 'section', id: 'about' });
  });
});

describe('extractProjectSlugs', () => {
  it('returns valid project slugs in order of appearance, deduplicated', () => {
    expect(
      extractProjectSlugs('[A](?project=findit) [B](?project=nope) [A](?project=findit) [C](?project=yellow-rooms)'),
    ).toEqual(['findit', 'yellow-rooms']);
  });

  it('ignores images and non-project links', () => {
    expect(extractProjectSlugs('![x](?project=findit) [Work](#projects) [site](https://findit.moe/)')).toEqual([]);
  });
});

describe('KNOWN_LINK_ORIGINS', () => {
  it('contains every catalog link origin and every http(s) contact link', () => {
    const urls = [
      ...catalog.flatMap((project) => [project.url, project.repoUrl, project.apiUrl]),
      ...profile.contactLinks.map((link) => link.url),
    ].filter((url): url is string => Boolean(url) && /^https?:/.test(url as string));

    for (const url of urls) expect(KNOWN_LINK_ORIGINS.has(new URL(url).origin)).toBe(true);
    expect(Array.from(KNOWN_LINK_ORIGINS).every((origin) => /^https?:\/\//.test(origin))).toBe(true);
  });
});
