import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_MODAL_HISTORY_STATE } from '@/components/Projects/projectLink';

import ChatLink from './ChatLink';
import { ChatNavContext, type ChatNav } from './chatNavContext';
import type { PanelLayout } from './hooks/usePanelLayout';

// jsdom's accessible-name algorithm trims the sr-only span's leading space; browsers keep it.
function renderLink(href: string | undefined, layout: PanelLayout = 'floating') {
  const nav: ChatNav = { layout, onHide: vi.fn(), announce: vi.fn() };
  render(
    <ChatNavContext.Provider value={nav}>
      <p>
        <ChatLink href={href}>Label</ChatLink>
      </p>
    </ChatNavContext.Provider>,
  );
  return nav;
}

describe('ChatLink', () => {
  let page: HTMLElement;
  let pushState: ReturnType<typeof vi.spyOn>;
  let replaceState: ReturnType<typeof vi.spyOn>;
  let scrollIntoView: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    page = document.createElement('main');
    page.innerHTML = [
      '<section id="projects"><h2 id="projects-heading">Work</h2></section>',
      '<section id="about"><h2 id="about-heading">About</h2><div id="contact">Contact</div></section>',
    ].join('');
    document.body.append(page);
    pushState = vi.spyOn(window.history, 'pushState');
    replaceState = vi.spyOn(window.history, 'replaceState');
    scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    page.remove();
  });

  it('opens a known project in the page and announces it', () => {
    const nav = renderLink('?project=findit');
    const link = screen.getByRole('link', { name: /^Label ?\(project details\)$/ });
    expect(link).toHaveAttribute('href', '?project=findit');
    expect(link).not.toHaveAttribute('target');

    const click = fireEvent.click(link);
    expect(click).toBe(false);
    expect(pushState).toHaveBeenCalledWith(PROJECT_MODAL_HISTORY_STATE, '', expect.objectContaining({ search: '?project=findit' }));
    expect(nav.announce).toHaveBeenCalledWith('Opened FindIT.');
    expect(nav.onHide).not.toHaveBeenCalled();
  });

  it('normalizes the project slug from the href', () => {
    renderLink('/?project=FindIT');
    expect(screen.getByRole('link', { name: /project details/ })).toHaveAttribute('href', '?project=findit');
  });

  it('lets modified clicks fall through to the real href', () => {
    const nav = renderLink('?project=findit');
    const link = screen.getByRole('link');
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      expect(fireEvent.click(link, modifier)).toBe(true);
    }
    expect(pushState).not.toHaveBeenCalled();
    expect(nav.announce).not.toHaveBeenCalled();
  });

  it('applies a category filter in place in the floating layout', () => {
    const nav = renderLink('?category=agents-llm');
    const link = screen.getByRole('link', { name: /^Label ?\(filters the project list\)$/ });
    expect(link).toHaveAttribute('href', '?category=agents-llm');

    fireEvent.click(link);
    expect(replaceState).toHaveBeenCalledWith(null, '', expect.objectContaining({ search: '?category=agents-llm' }));
    expect(scrollIntoView.mock.contexts).toContain(document.getElementById('projects'));
    expect(nav.announce).toHaveBeenCalledWith(expect.stringMatching(/^Showing \d+ Agents & LLM Tooling projects\.$/));
    expect(nav.onHide).not.toHaveBeenCalled();
  });

  it('announces a technology filter with its count', () => {
    const nav = renderLink('?stack=qdrant');
    fireEvent.click(screen.getByRole('link'));
    expect(replaceState).toHaveBeenCalledWith(null, '', expect.objectContaining({ search: '?stack=QDRANT' }));
    expect(nav.announce).toHaveBeenCalledWith(expect.stringMatching(/^Showing \d+ projects using QDRANT\.$/));
  });

  it('hides the sheet first, then filters and moves focus to the Work heading', async () => {
    const nav = renderLink('?category=agents-llm', 'sheet');
    fireEvent.click(screen.getByRole('link'));

    expect(nav.onHide).toHaveBeenCalledWith({ restoreFocus: false });
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('projects-heading')));
    expect(window.location.search).toBe('?category=agents-llm');
    expect(document.getElementById('projects-heading')).toHaveAttribute('tabindex', '-1');
    expect(nav.announce).not.toHaveBeenCalled();
  });

  it('scrolls to a section and announces it', () => {
    const nav = renderLink('#about');
    const link = screen.getByRole('link', { name: 'Label' });
    expect(link).toHaveAttribute('href', '#about');

    fireEvent.click(link);
    expect(scrollIntoView.mock.contexts).toContain(document.getElementById('about'));
    expect(nav.announce).toHaveBeenCalledWith('Moved to About.');
  });

  it('in the sheet, a section link hides the chat and focuses the section', async () => {
    const nav = renderLink('#contact', 'sheet');
    fireEvent.click(screen.getByRole('link'));
    expect(nav.onHide).toHaveBeenCalledWith({ restoreFocus: false });
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('contact')));
  });

  it('opens allowlisted external links in a new tab with a cue', () => {
    renderLink('https://findit.moe/');
    const link = screen.getByRole('link', { name: /^Label ?\(opens in new tab\)$/ });
    expect(link).toHaveAttribute('href', 'https://findit.moe/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('keeps a published mailto in the same tab', () => {
    renderLink('mailto:andres@arz.ai');
    const link = screen.getByRole('link', { name: 'Label' });
    expect(link).toHaveAttribute('href', 'mailto:andres@arz.ai');
    expect(link).not.toHaveAttribute('target');
  });

  it.each([
    ['an unknown origin', 'https://evil.example/'],
    ['an unknown project', '?project=nope'],
    ['an unknown section', '#nope'],
    ['a script URL', 'javascript:alert(1)'],
    ['a data URL', 'data:text/html,x'],
    ['an unpublished mailto', 'mailto:x@y.z'],
    ['an empty href', ''],
    ['no href', undefined],
  ])('renders %s as plain text', (_label, href) => {
    renderLink(href);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Label').tagName).toBe('SPAN');
  });
});
