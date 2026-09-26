import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import About from './About';
import { PROJECT_CATEGORIES } from './Projects/catalog';

function renderPage() {
  const utils = render(
    <>
      <section id="projects">
        <h2 id="projects-heading">Work</h2>
      </section>
      <About />
    </>,
  );
  const scrollIntoView = vi.spyOn(document.getElementById('projects') as HTMLElement, 'scrollIntoView');
  return { ...utils, scrollIntoView };
}

describe('About shortcuts into Work', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('filters Work by category and scrolls to it', () => {
    window.history.replaceState(null, '', '/?stack=PYTHON');
    const { scrollIntoView } = renderPage();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const category = PROJECT_CATEGORIES[0];
    const list = screen.getByRole('heading', { name: 'What I work on' }).nextElementSibling as HTMLElement;

    fireEvent.click(within(list).getAllByRole('button')[0]);

    expect(window.location.search).toBe(`?category=${category.id}`);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('filters Work by a toolbox technology and scrolls to it', () => {
    window.history.replaceState(null, '', `/?category=${PROJECT_CATEGORIES[0].id}`);
    const { scrollIntoView } = renderPage();
    const toolbox = screen.getByRole('heading', { name: 'Toolbox' }).parentElement as HTMLElement;
    const chip = within(toolbox).getAllByRole('button')[0];
    const technology = chip.firstChild?.textContent ?? '';

    fireEvent.click(chip);

    expect(new URLSearchParams(window.location.search).get('stack')).toBe(technology);
    expect(new URLSearchParams(window.location.search).has('category')).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
