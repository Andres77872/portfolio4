import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ChatPanelSkeleton from './ChatPanelSkeleton';

function renderSkeleton(open = true) {
  const frame = document.createElement('div');
  document.body.append(frame);
  const onClose = vi.fn();
  const utils = render(<ChatPanelSkeleton open={open} frameRef={{ current: frame }} onClose={onClose} />, {
    container: frame,
  });
  return { ...utils, frame, onClose };
}

describe('ChatPanelSkeleton', () => {
  it('keeps the dialog named and described while the panel chunk loads', () => {
    const { frame } = renderSkeleton();
    expect(screen.getByRole('heading', { level: 2, name: 'Portfolio assistant' })).toHaveAttribute('id', 'chat-title');
    expect(screen.getByText('Loading assistant…')).toHaveAttribute('aria-busy', 'true');
    expect(document.getElementById('chat-disclosure')).toHaveTextContent(/external AI service/);
    frame.remove();
  });

  it('closes from its Close button and on Escape from inside the frame or the page body', () => {
    const { frame, onClose } = renderSkeleton();
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close assistant' }), { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
    frame.remove();
  });

  it('leaves Escape in other page controls, and while hidden, to the page', () => {
    const outside = document.createElement('input');
    document.body.append(outside);
    const { frame, onClose, rerender } = renderSkeleton();

    fireEvent.keyDown(outside, { key: 'Escape' });
    rerender(<ChatPanelSkeleton open={false} frameRef={{ current: frame }} onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    outside.remove();
    frame.remove();
  });
});
