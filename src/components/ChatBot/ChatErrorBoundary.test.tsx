import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatErrorBoundary from './ChatErrorBoundary';

let shouldThrow = true;

// jsdom reports errors thrown during render to window "error"; the boundary handles them.
const swallowRenderError = (event: ErrorEvent) => event.preventDefault();

function Flaky() {
  if (shouldThrow) throw new Error('chunk failed');
  return <p>Panel loaded</p>;
}

describe('ChatErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs caught render errors; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', swallowRenderError);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.removeEventListener('error', swallowRenderError);
  });

  function renderBoundary(resetKey: number, onRetry = vi.fn(), onClose = vi.fn()) {
    const frame = document.createElement('div');
    const element = (key: number) => (
      <ChatErrorBoundary resetKey={key} open frameRef={{ current: frame }} onRetry={onRetry} onClose={onClose}>
        <Flaky />
      </ChatErrorBoundary>
    );
    const utils = render(element(resetKey));
    return { ...utils, onRetry, onClose, rerenderWith: (key: number) => utils.rerender(element(key)) };
  }

  it('keeps a failure inside the panel with retry, email and close actions', () => {
    const { onRetry, onClose } = renderBoundary(0);

    expect(screen.getByText("The assistant couldn't load.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Portfolio assistant' })).toHaveAttribute('id', 'chat-title');
    expect(screen.getByRole('link', { name: 'Email Andres' })).toHaveAttribute('href', 'mailto:andres@arz.ai');

    // The dialog's aria-describedby still resolves while the chunk is unavailable.
    expect(document.getElementById('chat-disclosure')).toHaveTextContent(/can be wrong/);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the children again once the reset key changes', () => {
    const { rerenderWith } = renderBoundary(0);
    shouldThrow = false;

    rerenderWith(0);
    expect(screen.getByText("The assistant couldn't load.")).toBeInTheDocument();

    rerenderWith(1);
    expect(screen.getByText('Panel loaded')).toBeInTheDocument();
  });

  it('closes on Escape from the page body', () => {
    const { onClose } = renderBoundary(0);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
