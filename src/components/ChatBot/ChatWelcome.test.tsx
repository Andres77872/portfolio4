import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { catalog, findProjectBySlug, getFeaturedProjects } from '@/components/Projects/catalog';
import type { CatalogProject } from '@/components/Projects/types';

import ChatWelcome from './ChatWelcome';

const findit = findProjectBySlug(catalog, 'findit') as CatalogProject;

describe('ChatWelcome', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('shows one line of copy and four short suggestions', () => {
    render(<ChatWelcome focusProject={null} onPick={vi.fn()} onClearFocus={vi.fn()} />);

    expect(screen.getByText('Ask the portfolio')).toBeInTheDocument();
    expect(
      screen.getByText("Ask about Andres's projects, stack or availability. Answers link straight to the work."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();

    const group = screen.getByRole('group', { name: 'Try asking' });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Tour the featured work',
      `How does ${getFeaturedProjects(catalog)[0].title} work?`,
      'Open-source projects',
      'Is Andres available?',
    ]);
  });

  it('bottom-anchors with an auto margin, so overflow stays reachable by scrolling', () => {
    const { container } = render(<ChatWelcome focusProject={null} onPick={vi.fn()} onClearFocus={vi.fn()} />);
    const scroller = container.firstElementChild as HTMLElement;
    // justify-end would push overflow past the top edge, where it cannot be scrolled to (short sheet).
    expect(scroller.className).not.toMatch(/\bjustify-end\b/);
    expect(scroller).toHaveClass('overflow-y-auto');
    expect(scroller.firstElementChild).toHaveClass('mt-auto');
  });

  it('sends the full prompt, not the chip label', () => {
    const onPick = vi.fn();
    render(<ChatWelcome focusProject={null} onPick={onPick} onClearFocus={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tour the featured work' }));
    expect(onPick).toHaveBeenCalledWith("Give me a quick tour of Andres's featured projects.");
  });

  it('turns the tour chip into "Best of {category}" while a category filter is active', () => {
    window.history.replaceState(null, '', '/?category=agents-llm');
    render(<ChatWelcome focusProject={null} onPick={vi.fn()} onClearFocus={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Best of Agents & LLM Tooling' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tour the featured work' })).toBeNull();
  });

  it('ignores an unknown category', () => {
    window.history.replaceState(null, '', '/?category=bogus');
    render(<ChatWelcome focusProject={null} onPick={vi.fn()} onClearFocus={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Tour the featured work' })).toBeInTheDocument();
  });

  it('switches to project questions when opened from a project', () => {
    const onPick = vi.fn();
    render(<ChatWelcome focusProject={findit} onPick={onPick} onClearFocus={vi.fn()} />);

    expect(screen.getByText('Ask about FindIT')).toBeInTheDocument();
    expect(screen.getByText('Questions here are about FindIT unless you say otherwise.')).toBeInTheDocument();

    const chips = within(screen.getByRole('group', { name: 'Try asking' })).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'What problem does it solve?',
      'How is it built?',
      'Similar projects',
      'Where can I try it?',
    ]);

    fireEvent.click(chips[0]);
    expect(onPick).toHaveBeenCalledWith('What problem does FindIT solve?');
  });

  it('offers a way back to general questions only when focused on a project', () => {
    const onClearFocus = vi.fn();
    const { rerender } = render(<ChatWelcome focusProject={findit} onPick={vi.fn()} onClearFocus={onClearFocus} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask about all projects instead' }));
    expect(onClearFocus).toHaveBeenCalledTimes(1);

    rerender(<ChatWelcome focusProject={null} onPick={vi.fn()} onClearFocus={onClearFocus} />);
    expect(screen.queryByRole('button', { name: 'Ask about all projects instead' })).not.toBeInTheDocument();
  });
});
