import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

const setTheme = vi.fn();
const themeState = vi.hoisted(() => ({
  theme: 'dark' as string | undefined,
  resolvedTheme: 'dark' as string | undefined,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: themeState.theme,
    resolvedTheme: themeState.resolvedTheme,
    setTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    setTheme.mockClear();
    themeState.theme = 'dark';
    themeState.resolvedTheme = 'dark';
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles from dark to light on direct button click', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));

    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('toggles from system dark to explicit light so the visible theme changes', () => {
    themeState.theme = 'system';
    themeState.resolvedTheme = 'dark';

    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));

    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('toggles from system light to explicit dark so the visible theme changes', () => {
    themeState.theme = 'system';
    themeState.resolvedTheme = 'light';

    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));

    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
