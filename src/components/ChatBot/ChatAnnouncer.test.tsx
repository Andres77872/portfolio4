import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatAnnouncerProvider } from './ChatAnnouncer';
import { useAnnounce, type Announce } from './chatAnnouncerContext';

function renderWithAnnouncer() {
  const handle: { announce: Announce | null } = { announce: null };
  function Probe() {
    handle.announce = useAnnounce();
    return null;
  }
  render(
    <ChatAnnouncerProvider>
      <Probe />
    </ChatAnnouncerProvider>,
  );
  return (message: string) => act(() => handle.announce?.(message));
}

describe('ChatAnnouncerProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders exactly one polite, atomic status region', () => {
    renderWithAnnouncer();
    const regions = screen.getAllByRole('status');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveAttribute('aria-live', 'polite');
    expect(regions[0]).toHaveAttribute('aria-atomic', 'true');
    expect(regions[0]).toHaveTextContent('');
  });

  it('sets the text after 50 ms and clears it after 10 s', () => {
    const announce = renderWithAnnouncer();
    const region = screen.getByRole('status');

    announce('Assistant is thinking.');
    expect(region).toHaveTextContent('');

    act(() => vi.advanceTimersByTime(50));
    expect(region).toHaveTextContent('Assistant is thinking.');

    act(() => vi.advanceTimersByTime(9_999));
    expect(region).toHaveTextContent('Assistant is thinking.');
    act(() => vi.advanceTimersByTime(1));
    expect(region).toHaveTextContent('');
  });

  it('blanks the region first, so the same message is announced again', () => {
    const announce = renderWithAnnouncer();
    const region = screen.getByRole('status');

    announce('Conversation cleared.');
    act(() => vi.advanceTimersByTime(50));
    expect(region).toHaveTextContent('Conversation cleared.');

    announce('Conversation cleared.');
    expect(region).toHaveTextContent('');
    act(() => vi.advanceTimersByTime(50));
    expect(region).toHaveTextContent('Conversation cleared.');
  });

  it('keeps only the latest of two quick messages', () => {
    const announce = renderWithAnnouncer();
    const region = screen.getByRole('status');

    announce('First');
    announce('Second');
    act(() => vi.advanceTimersByTime(50));
    expect(region).toHaveTextContent('Second');
  });

  it('is a no-op outside a provider', () => {
    let announce: Announce | null = null;
    function Probe() {
      announce = useAnnounce();
      return null;
    }
    render(<Probe />);
    expect(() => announce?.('Nothing listens')).not.toThrow();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
