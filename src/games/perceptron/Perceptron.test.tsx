import { readFileSync } from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real file the site serves, so the component is exercised end to end:
// download → gunzip → checksum → parse → train.
const DATASET = readFileSync(path.resolve(__dirname, '../../../public/data/mnist/mnist-subset.bin.gz'));

const serveDataset = () =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(DATASET) as BodyInit)));

// Module state (downloaded dataset, training session) persists across mounts by
// design, so each test gets fresh modules.
async function renderDemo() {
  vi.resetModules();
  const { default: Perceptron } = await import('./Perceptron');
  return render(<Perceptron />);
}

beforeEach(() => {
  // jsdom has no 2D canvas; painting is a no-op without a context.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Perceptron demo', () => {
  it('starts with an explanation and a single call to action', async () => {
    await renderDemo();

    expect(screen.getByRole('heading', { name: 'Watch a perceptron learn to read handwriting' })).toBeInTheDocument();
    expect(screen.getByText(/1\.9 MB download/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Step' })).toBeDisabled();
  });

  it('downloads real MNIST, starts training, and steps one sample at a time', async () => {
    serveDataset();
    await renderDemo();

    fireEvent.click(screen.getByRole('button', { name: /Load MNIST & train/ }));
    expect(await screen.findByRole('button', { name: 'Pause' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: false, name: '' })).toHaveTextContent(/MNIST loaded: 10,000 training and 2,000 test digits/);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText(/Epoch 1\/20 · 0 seen · 0 updates/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(screen.getByText(/Epoch 1\/20 · 1 seen/)).toBeInTheDocument();
    // Untrained weights always guess 0; the caption spells out the update.
    expect(screen.getByText(/guessed/).textContent).toMatch(/Label \d, guessed 0/);
    // The baseline evaluation of the all-zero model: it always says 0, right 10% of the time.
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('switches learning rule, which restarts the model', async () => {
    serveDataset();
    await renderDemo();
    fireEvent.click(screen.getByRole('button', { name: /Load MNIST & train/ }));
    await screen.findByRole('button', { name: 'Pause' }, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));

    fireEvent.click(screen.getByRole('button', { name: 'Softmax' }));
    expect(screen.getByRole('button', { name: 'Softmax' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/0 seen · 0 updates/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    // Softmax updates on every sample, right or wrong.
    expect(screen.getByText(/1 seen · 1 updates/)).toBeInTheDocument();
  });

  it('explains a failed download and retries', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderDemo();

    fireEvent.click(screen.getByRole('button', { name: /Load MNIST & train/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/HTTP 503/);

    fetchMock.mockImplementation(async () => new Response(new Uint8Array(DATASET) as BodyInit));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    expect(await screen.findByRole('button', { name: 'Pause' }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('opens and closes the explanation with Escape', async () => {
    await renderDemo();

    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    const dialog = screen.getByRole('dialog', { name: 'How the perceptron learns' });
    expect(dialog).toHaveTextContent(/Rosenblatt, 1958/);
    expect(screen.getByRole('button', { name: 'Close explanation' })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
