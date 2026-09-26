import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Playground from './Playground';

// The panel's real games draw on canvases and start loops; stand-ins keep this test
// about the shell: tabs, URL state and lazy mounting.
vi.mock('@/games/perceptron/Perceptron', () => ({ default: () => <p>Perceptron game</p> }));
vi.mock('@/games/game-of-life/GameOfLife', () => ({ default: () => <p>Life game</p> }));
vi.mock('@/games/neural-nexus/NeuralNexus', () => ({ default: () => <p>Nexus game</p> }));
vi.mock('@/games/matrix-rpg/MatrixRPG', () => ({ default: () => <p>Matrix game</p> }));

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('Playground', () => {
  it('lists the four experiments and mounts the default one', async () => {
    render(<Playground />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    expect(screen.getByRole('tab', { name: 'Perceptron on MNIST' })).toHaveAccessibleDescription(
      'A neural network learning to read, live',
    );
    expect(await screen.findByText('Perceptron game')).toBeInTheDocument();
  });

  it('opens the experiment named in ?experiment= and writes the choice back to the URL', async () => {
    window.history.replaceState(null, '', '/?experiment=game-of-life#playground');
    render(<Playground />);

    expect(screen.getByRole('tab', { name: 'Game of Life' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Life game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Matrix RPG' }));
    expect(window.location.search).toBe('?experiment=matrix-rpg');
    expect(window.location.hash).toBe('#playground');
    expect(await screen.findByText('Matrix game')).toBeInTheDocument();

    // The default experiment keeps the URL clean.
    fireEvent.click(screen.getByRole('tab', { name: 'Perceptron on MNIST' }));
    expect(window.location.search).toBe('');
  });

  it('falls back to the default for an unknown experiment id', () => {
    window.history.replaceState(null, '', '/?experiment=nope');
    render(<Playground />);
    expect(screen.getByRole('tab', { name: 'Perceptron on MNIST' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves between experiments with the arrow keys, Home and End', () => {
    render(<Playground />);
    const first = screen.getByRole('tab', { name: 'Perceptron on MNIST' });

    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'Game of Life' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Game of Life' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Matrix RPG' })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
  });
});
