import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockMatchMedia } from '@/test/media';
import GameOfLife from './GameOfLife';

// jsdom lays nothing out: give the grid surface a size so the world gets built
// (480×240 at 8px cells → 60×30), and skip painting (no 2D context).
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(480);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(240);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Game of Life', () => {
  it('seeds a random soup on a torus sized to the surface', () => {
    render(<GameOfLife />);

    expect(screen.getByText(/B3\/S23 · 60×30 torus/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Game of Life grid, 60 by 30 cells/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Generation 0, population [1-9]\d*\./ })).toBeInTheDocument();
  });

  it('starts paused when the visitor prefers reduced motion', () => {
    mockMatchMedia({ reducedMotion: true });
    render(<GameOfLife />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('steps, clears and toggles play from the controls and the keyboard', () => {
    mockMatchMedia({ reducedMotion: true });
    render(<GameOfLife />);
    const grid = screen.getByRole('img', { name: /Game of Life grid/ });

    fireEvent.click(screen.getByRole('button', { name: 'Step one generation' }));
    expect(screen.getByRole('img', { name: /Generation 1,/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear the grid' }));
    expect(screen.getByRole('img', { name: /Generation 0, population 0\./ })).toBeInTheDocument();
    expect(screen.getByText('Extinct')).toBeInTheDocument();

    fireEvent.keyDown(grid, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.keyDown(grid, { key: ' ' });
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    fireEvent.keyDown(grid, { key: 'r' });
    expect(screen.getByRole('img', { name: /population [1-9]/ })).toBeInTheDocument();
  });

  it('draws a cell where the grid is clicked', () => {
    mockMatchMedia({ reducedMotion: true });
    render(<GameOfLife />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear the grid' }));
    const grid = screen.getByRole('img', { name: /Game of Life grid/ });

    fireEvent.pointerDown(grid, { clientX: 20, clientY: 20, button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(grid);
    expect(screen.getByRole('img', { name: /population 1\./ })).toBeInTheDocument();

    // Clicking a live cell erases it.
    fireEvent.pointerDown(grid, { clientX: 20, clientY: 20, button: 0, pointerType: 'mouse' });
    expect(screen.getByRole('img', { name: /population 0\./ })).toBeInTheDocument();
  });

  it('stamps a library pattern, then Escape returns to drawing', () => {
    mockMatchMedia({ reducedMotion: true });
    render(<GameOfLife />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear the grid' }));
    const grid = screen.getByRole('img', { name: /Game of Life grid/ });

    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'glider' } });
    expect(screen.getByText(/Click to place/)).toHaveTextContent('Click to place Glider');

    fireEvent.pointerDown(grid, { clientX: 200, clientY: 120, button: 0, pointerType: 'mouse' });
    expect(screen.getByRole('img', { name: /population 5\./ })).toBeInTheDocument();

    fireEvent.keyDown(grid, { key: 'Escape' });
    expect(screen.queryByText(/Click to place/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pattern')).toHaveValue('draw');
  });

  it('switches to another life-like rule', () => {
    render(<GameOfLife />);
    fireEvent.change(screen.getByLabelText('Rule'), { target: { value: 'highlife' } });
    expect(screen.getByText(/B36\/S23 · 60×30 torus/)).toBeInTheDocument();
  });
});
