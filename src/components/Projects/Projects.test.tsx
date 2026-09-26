import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Projects from './Projects';
import { showWork } from './projectLink';

describe('Projects', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('clears the search box when filters are applied from elsewhere', () => {
    render(<Projects />);
    const search = screen.getByRole('searchbox', { name: 'Search projects' });

    fireEvent.change(search, { target: { value: 'graph' } });
    expect(search).toHaveValue('graph');

    act(() => showWork({ category: 'agents-llm' }));

    expect(search).toHaveValue('');
    expect(window.location.search).toBe('?category=agents-llm');
  });
});
