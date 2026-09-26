import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockMatchMedia } from '@/test/media';

import { focusSection, prefersReducedMotion, scrollToSection } from './scroll';

describe('focusSection', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("focuses a section's heading and makes it programmatically focusable", () => {
    document.body.innerHTML = '<section id="projects"><h2 id="projects-heading">Work</h2></section>';
    const heading = document.getElementById('projects-heading') as HTMLElement;

    focusSection('projects');

    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('keeps an existing tabindex', () => {
    document.body.innerHTML = '<section id="projects"><h2 id="projects-heading" tabindex="0">Work</h2></section>';

    focusSection('projects');

    expect(document.getElementById('projects-heading')?.getAttribute('tabindex')).toBe('0');
  });

  it('falls back to the element itself', () => {
    document.body.innerHTML = '<div id="contact">Contact</div>';

    focusSection('contact');

    expect(document.activeElement).toBe(document.getElementById('contact'));
  });

  it('does nothing for a missing id', () => {
    expect(() => focusSection('missing')).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('prefersReducedMotion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reads the reduced-motion media query', () => {
    mockMatchMedia({ reducedMotion: true });
    expect(prefersReducedMotion()).toBe(true);

    mockMatchMedia({ reducedMotion: false });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('drives the scroll behavior', () => {
    document.body.innerHTML = '<section id="projects"></section>';
    const section = document.getElementById('projects') as HTMLElement;
    const scrollIntoView = vi.spyOn(section, 'scrollIntoView');

    mockMatchMedia({ reducedMotion: true });
    scrollToSection('projects');
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' });

    mockMatchMedia({ reducedMotion: false });
    scrollToSection('projects');
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
