import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ChatComposer, { type ChatComposerProps } from './ChatComposer';
import { DISCLOSURE_TEXT } from './constants';
import type { SendResult } from './hooks/useChat';

function renderComposer(overrides: Partial<ChatComposerProps> = {}) {
  const props: ChatComposerProps = {
    busy: false,
    placeholder: 'Ask about a project, a technology or availability…',
    onSend: vi.fn<(text: string) => SendResult>(() => ({ ok: true })),
    onStop: vi.fn(),
    onBusyEnter: vi.fn(),
    onLimitCrossed: vi.fn(),
    shortLayout: false,
    ...overrides,
  };
  const utils = render(<ChatComposer {...props} />);
  const textarea = screen.getByRole('textbox', { name: 'Message the portfolio assistant' }) as HTMLTextAreaElement;
  const type = (value: string) => fireEvent.change(textarea, { target: { value } });
  return { ...utils, props, textarea, type };
}

describe('ChatComposer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits on Enter and clears the draft only when the send is accepted', () => {
    const onSend = vi.fn<(text: string) => SendResult>(() => ({ ok: false, reason: 'busy' }));
    const { textarea, type, rerender, props } = renderComposer({ onSend });

    type('Hello');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Hello');
    expect(textarea.value).toBe('Hello');

    onSend.mockReturnValue({ ok: true });
    rerender(<ChatComposer {...props} onSend={onSend} />);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(textarea.value).toBe('');
  });

  it('submits through the Send button too', () => {
    const { props, type } = renderComposer();
    type('Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalledWith('Hello');
  });

  it('leaves Shift+Enter to insert a newline', () => {
    const { props, textarea, type } = renderComposer();
    type('Line one');
    const event = fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(event).toBe(true); // not prevented: the browser inserts the newline
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('never submits while an IME composition is active', () => {
    const { props, textarea, type } = renderComposer();
    type('日本');

    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });

    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('does not send an empty or whitespace-only draft', () => {
    const { props, textarea, type } = renderComposer();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    type('   ');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(props.onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send message' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('while busy, Enter keeps the draft and notifies once per stream', () => {
    const { props, textarea, type, rerender } = renderComposer({ busy: true });
    type('Next question');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(props.onBusyEnter).toHaveBeenCalledTimes(1);
    expect(props.onSend).not.toHaveBeenCalled();
    expect(textarea.value).toBe('Next question');

    // The answer settles, a new one starts: the notice may play again.
    rerender(<ChatComposer {...props} busy={false} />);
    rerender(<ChatComposer {...props} busy />);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(props.onBusyEnter).toHaveBeenCalledTimes(2);
  });

  it('turns the same button node into Stop while busy', () => {
    const { props, rerender } = renderComposer();
    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).toHaveAttribute('type', 'submit');

    rerender(<ChatComposer {...props} busy />);
    const stop = screen.getByRole('button', { name: 'Stop answer' });
    expect(stop).toBe(send);
    expect(stop).toHaveAttribute('type', 'button');
    expect(stop).not.toHaveAttribute('aria-disabled');

    // A deliberate Stop comes well after the send gesture (see the double-click guard test).
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1_000);
    const click = fireEvent.click(stop);
    expect(props.onStop).toHaveBeenCalledTimes(1);
    expect(click).toBe(false); // prevented, so the node can never submit the form on this click
    expect(props.onSend).not.toHaveBeenCalled();

    rerender(<ChatComposer {...props} busy={false} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBe(send);
  });

  it('ignores Stop clicks that belong to the send gesture (double-click or immediate second tap)', () => {
    const { props, rerender } = renderComposer();
    const button = screen.getByRole('button', { name: 'Send message' });

    rerender(<ChatComposer {...props} busy />);
    fireEvent.click(button, { detail: 1 }); // second tap right after the send
    fireEvent.click(button, { detail: 2 }); // second click of a double-click
    expect(props.onStop).not.toHaveBeenCalled();

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1_000);
    fireEvent.click(button, { detail: 2 });
    expect(props.onStop).not.toHaveBeenCalled();
    fireEvent.click(button, { detail: 1 });
    expect(props.onStop).toHaveBeenCalledTimes(1);
  });

  it('never disables the textarea', () => {
    const { textarea, props, rerender } = renderComposer({ busy: true });
    expect(textarea).not.toBeDisabled();
    rerender(<ChatComposer {...props} busy={false} />);
    expect(textarea).not.toBeDisabled();
  });

  it('references the disclosure, and the counter once it shows', () => {
    const { textarea, type } = renderComposer();
    expect(textarea).toHaveAttribute('aria-describedby', 'chat-disclosure');
    expect(document.getElementById('chat-disclosure')).toHaveTextContent(/can be wrong/);

    type('a'.repeat(1599));
    expect(document.getElementById('chat-count')).toBeNull();

    type('a'.repeat(1600));
    expect(document.getElementById('chat-count')).toHaveTextContent('1,600 / 2,000');
    expect(textarea).toHaveAttribute('aria-describedby', 'chat-disclosure chat-count');
    // The counter sits in the disclosure row but is described once, and never as part of the disclosure.
    expect(textarea).toHaveAccessibleDescription(`${DISCLOSURE_TEXT} 1,600 / 2,000`);
    expect(document.getElementById('chat-disclosure')).toHaveTextContent(DISCLOSURE_TEXT, { normalizeWhitespace: true });
    expect(document.getElementById('chat-disclosure')).not.toHaveTextContent(/1,600/);
  });

  it('blocks sending over the limit and reports the crossing once', () => {
    const { props, textarea, type } = renderComposer();

    type('a'.repeat(2001));
    type('a'.repeat(2140));
    expect(props.onLimitCrossed).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).not.toHaveAttribute('maxlength');
    expect(document.getElementById('chat-count')).toHaveTextContent('2,140 / 2,000 · shorten to send');

    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(send);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(props.onSend).not.toHaveBeenCalled();

    // Back under the limit, then over again: announced again.
    type('a'.repeat(1990));
    expect(textarea).not.toHaveAttribute('aria-invalid');
    type('a'.repeat(2005));
    expect(props.onLimitCrossed).toHaveBeenCalledTimes(2);
  });

  it('shows the placeholder it is given', () => {
    renderComposer({ placeholder: 'Ask about FindIT…' });
    expect(screen.getByPlaceholderText('Ask about FindIT…')).toBeInTheDocument();
  });

  it('scrolls itself into view on focus in the short layout', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);
    const { textarea } = renderComposer({ shortLayout: true });
    fireEvent.focus(textarea);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    scrollIntoView.mockRestore();
  });
});
