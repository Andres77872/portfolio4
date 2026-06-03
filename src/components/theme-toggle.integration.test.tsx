import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle with next-themes provider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    });
  });

  it('updates the document theme class when toggled from dark to light', async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));

    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
