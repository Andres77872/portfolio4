import { act, render, waitFor } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useChatPanelFocus, type ChatPanelFocusOptions } from './useChatPanelFocus';

type HarnessProps = Pick<ChatPanelFocusOptions, 'open' | 'coarse' | 'busy' | 'itemCount'> & { showChip?: boolean };

function Harness({ open, coarse, busy, itemCount, showChip = false }: HarnessProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef({ focus: () => textareaRef.current?.focus() });
  useChatPanelFocus({ open, coarse, frameRef, composerRef, busy, itemCount });
  return (
    <div ref={frameRef} tabIndex={-1} data-testid="frame" hidden={!open}>
      {showChip && <button type="button">Chip</button>}
      <textarea ref={textareaRef} aria-label="composer" />
    </div>
  );
}

const byId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const textarea = () => document.querySelector('textarea') as HTMLTextAreaElement;

describe('useChatPanelFocus', () => {
  it('on mount, takes focus from the frame (the chunk arrived after opening)', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { rerender } = render(<Harness open={false} coarse={false} busy={false} itemCount={0} />);

    // Opening while the panel is mounted counts as a transition: the composer takes focus.
    outside.focus();
    rerender(<Harness open coarse={false} busy={false} itemCount={0} />);
    await waitFor(() => expect(document.activeElement).toBe(textarea()));
    outside.remove();
  });

  it('does not pull back a visitor who moved on while the chunk was loading', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();

    render(
      <StrictMode>
        <Harness open coarse={false} busy={false} itemCount={0} />
      </StrictMode>,
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('on mount, moves focus from the frame to the composer', async () => {
    render(<Harness open coarse={false} busy={false} itemCount={0} />);
    byId('frame').focus();
    await waitFor(() => expect(document.activeElement).toBe(textarea()));
  });

  it('keeps focus on the frame with a coarse pointer', async () => {
    const { rerender } = render(<Harness open={false} coarse busy={false} itemCount={0} />);
    rerender(<Harness open coarse busy={false} itemCount={0} />);
    await waitFor(() => expect(document.activeElement).toBe(byId('frame')));
  });

  it('does not move focus when the pointer type changes while the panel is open', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { rerender } = render(<Harness open coarse={false} busy={false} itemCount={0} />);
    await waitFor(() => expect(document.activeElement).toBe(textarea()));

    try {
      outside.focus();
      rerender(<Harness open coarse busy={false} itemCount={0} />);
      await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
      expect(document.activeElement).toBe(outside);
    } finally {
      outside.remove();
    }
  });

  it('returns focus to the composer when a focused control inside the panel disappears', async () => {
    const { rerender } = render(<Harness open coarse={false} busy={false} itemCount={0} showChip />);
    const chip = document.querySelector('button') as HTMLButtonElement;
    await waitFor(() => expect(document.activeElement).toBe(textarea()));
    act(() => chip.focus());

    rerender(<Harness open coarse={false} busy itemCount={2} />);
    expect(document.activeElement).toBe(textarea());
  });

  it('leaves focus alone after the visitor clicked the page background', async () => {
    const { rerender } = render(<Harness open coarse={false} busy itemCount={2} />);
    await waitFor(() => expect(document.activeElement).toBe(textarea()));

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    act(() => textarea().blur());
    rerender(<Harness open coarse={false} busy={false} itemCount={2} />);
    expect(document.activeElement).toBe(document.body);
  });
});
