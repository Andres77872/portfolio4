import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { triggerResize } from '@/test/dom';

import ChatTranscript, { type ChatTranscriptProps } from './ChatTranscript';
import type { AssistantTurn, ChatItem, UserTurn } from './conversation';

const user = (id: string, content: string): UserTurn => ({ id, role: 'user', content });
const assistant = (id: string, replyTo: string, patch: Partial<AssistantTurn> = {}): AssistantTurn => ({
  id,
  role: 'assistant',
  content: '',
  status: 'complete',
  replyTo,
  ...patch,
});

function renderTranscript(items: readonly ChatItem[], overrides: Partial<ChatTranscriptProps> = {}) {
  const props: ChatTranscriptProps = {
    items,
    busy: false,
    onRetry: vi.fn(),
    onNewChat: vi.fn(),
    stickSignal: 0,
    ...overrides,
  };
  const utils = render(<ChatTranscript {...props} />);
  return { ...utils, props };
}

describe('ChatTranscript', () => {
  it('is a focusable, labelled region that is not a live region', () => {
    const { container } = renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { content: 'Hello' })]);
    const region = screen.getByRole('region', { name: 'Conversation' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.querySelector('ol')).not.toBeNull();
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="log"]')).toBeNull();
  });

  it('labels every turn with an h3 speaker heading', () => {
    renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { content: 'Hello' })]);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['You', 'Assistant']);
    expect(headings[0]).toHaveClass('sr-only');
  });

  it('marks in-flight turns busy and names their state', () => {
    const { rerender, props } = renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { status: 'pending' })], {
      busy: true,
    });
    const pending = screen.getAllByRole('listitem')[1];
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(within(pending).getByRole('heading', { level: 3 })).toHaveTextContent('Assistant · Thinking…');

    rerender(
      <ChatTranscript {...props} items={[user('u1', 'Hi'), assistant('a1', 'u1', { status: 'streaming', content: 'Hel' })]} />,
    );
    const streaming = screen.getAllByRole('listitem')[1];
    expect(streaming).toHaveAttribute('aria-busy', 'true');
    expect(within(streaming).getByRole('heading', { level: 3 })).toHaveTextContent('Assistant · Answering…');
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();

    rerender(
      <ChatTranscript {...props} busy={false} items={[user('u1', 'Hi'), assistant('a1', 'u1', { content: 'Hello' })]} />,
    );
    expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-busy', 'false');
  });

  it('renders visitor text literally, never as markdown', () => {
    renderTranscript([user('u1', '*args* and 1. first')]);
    const bubble = screen.getByText('*args* and 1. first');
    expect(bubble.tagName).toBe('P');
    expect(bubble.querySelector('em, ol, li')).toBeNull();
  });

  it('renders answer headings as paragraphs, images as alt text and code blocks as focusable', () => {
    const content = '# Title\n\nSee ![diagram](https://evil.example/p.png) here.\n\n```\nnpm i\n```';
    const { container } = renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { content })]);

    expect(container.querySelector('h1, h2, h4, h5, h6')).toBeNull();
    expect(screen.getByText('Title').tagName).toBe('P');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('[diagram]')).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toHaveAttribute('tabindex', '0');
  });

  it('offers Retry on a stopped last turn and keeps the partial text', () => {
    const { props } = renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { status: 'stopped', content: 'Partial' })]);
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledWith('a1');
  });

  it('says so when an answer was stopped before any text arrived', () => {
    renderTranscript([user('u1', 'Hi'), assistant('a1', 'u1', { status: 'stopped' })]);
    expect(screen.getByText('Stopped before an answer arrived.')).toBeInTheDocument();
  });

  it('shows only a label on older failed or stopped turns', () => {
    renderTranscript([
      user('u1', 'A'),
      assistant('a1', 'u1', { status: 'error', error: 'unavailable' }),
      user('u2', 'B'),
      assistant('a2', 'u2', { status: 'stopped', content: 'Half' }),
      user('u3', 'C'),
      assistant('a3', 'u3', { content: 'Done' }),
    ]);
    expect(screen.getByText('Not answered')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    expect(screen.queryByText('The assistant is unavailable right now.')).toBeNull();
  });

  it('shows the error notice with its actions on the last failed turn', () => {
    const { props } = renderTranscript([user('u1', 'A'), assistant('a1', 'u1', { status: 'error', error: 'unavailable' })]);
    expect(screen.getByText('The assistant is unavailable right now.')).toBeInTheDocument();
    expect(screen.getByText('Try again in a moment, or reach Andres directly.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email Andres' })).toHaveAttribute('href', 'mailto:andres@arz.ai');
    expect(screen.getByRole('button', { name: 'Browse projects' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledWith('a1');
  });

  it('offers only New chat when the conversation is too long', () => {
    const { props } = renderTranscript([user('u1', 'A'), assistant('a1', 'u1', { status: 'error', error: 'too-long' })]);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(props.onNewChat).toHaveBeenCalledTimes(1);
  });

  it('cards linked projects under completed answers, each project once per conversation', () => {
    renderTranscript([
      user('u1', 'A'),
      assistant('a1', 'u1', { content: 'See [FindIT](?project=findit) and [Yellow Rooms](?project=yellow-rooms) and [ColWrite](?project=colwrite).' }),
      user('u2', 'B'),
      assistant('a2', 'u2', { content: 'Again [FindIT](?project=findit).' }),
    ]);

    const lists = screen.getAllByRole('list', { name: 'Projects in this answer' });
    expect(lists).toHaveLength(1);
    const cards = within(lists[0]).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole('link', { name: 'Open details: FindIT' })).toHaveAttribute('href', '?project=findit');
    expect(within(cards[1]).getByText('Yellow Rooms')).toBeInTheDocument();
  });

  it('shows no cards while an answer is still streaming', () => {
    renderTranscript(
      [user('u1', 'A'), assistant('a1', 'u1', { status: 'streaming', content: 'See [FindIT](?project=findit)' })],
      { busy: true },
    );
    expect(screen.queryByRole('list', { name: 'Projects in this answer' })).toBeNull();
  });

  it('offers "Jump to latest" after the visitor scrolls up, and moves focus to the region on use', () => {
    const items = [user('u1', 'Hi'), assistant('a1', 'u1', { status: 'streaming', content: 'Hello' })];
    const { rerender, props } = renderTranscript(items, { busy: true });
    const region = screen.getByRole('region', { name: 'Conversation' });
    const list = region.querySelector('ol') as HTMLOListElement;

    fireEvent.wheel(region, { deltaY: -100 });
    rerender(<ChatTranscript {...props} items={[items[0], { ...items[1], content: 'Hello world' }]} />);
    act(() => triggerResize(list));

    const jump = screen.getByRole('button', { name: 'Jump to latest' });
    jump.focus();
    fireEvent.click(jump);
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull();
    expect(document.activeElement).toBe(region);
  });
});
