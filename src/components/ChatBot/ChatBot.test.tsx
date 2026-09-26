import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }));

vi.mock('@/services/chatService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/chatService')>();
  return { ...actual, streamChatCompletion: streamMock };
});

import { PROJECT_MODAL_HISTORY_STATE } from '@/components/Projects/projectLink';
import { askAssistant } from '@/lib/assistant';
import { ChatServiceError, type streamChatCompletion } from '@/services/chatService';
import type { ChatRequest } from '@/services/chatTypes';
import { stubClientRects } from '@/test/dom';
import { mockMatchMedia, type MediaFlags } from '@/test/media';
import { bufferedStream, createControlledStream } from '@/test/streams';

import ChatBot from './ChatBot';
import { DISCLOSURE_TEXT } from './constants';
import { __setChatPanelImporterForTests } from './loadChatPanel';

const stream = streamMock as unknown as Mock<typeof streamChatCompletion>;

const LAUNCHER_NAME = /^Ask about my work/;

function renderPage(flags: MediaFlags = {}) {
  const media = mockMatchMedia(flags);
  const utils = render(
    <>
      <main id="main">
        <section id="projects">
          <h2 id="projects-heading">Work</h2>
          <input aria-label="Search projects" />
        </section>
      </main>
      <ChatBot />
    </>,
  );
  return { ...utils, media };
}

const launcher = () => screen.getByRole('button', { name: LAUNCHER_NAME });
const composer = () => screen.getByRole('textbox', { name: 'Message the portfolio assistant' }) as HTMLTextAreaElement;
const status = () => screen.getByRole('status');
const chatRootButton = () => document.querySelector('[data-chat-root] button') as HTMLButtonElement;

async function openChat() {
  fireEvent.click(launcher());
  const dialog = await screen.findByRole('dialog', { name: 'Portfolio assistant' });
  await screen.findByRole('textbox', { name: 'Message the portfolio assistant' });
  return dialog;
}

async function openAndFocus() {
  const dialog = await openChat();
  await waitFor(() => expect(document.activeElement).toBe(composer()));
  return dialog;
}

function typeAndSend(text: string) {
  fireEvent.change(composer(), { target: { value: text } });
  fireEvent.keyDown(composer(), { key: 'Enter' });
}

const lastAssistantTurn = () => {
  const items = within(screen.getByRole('region', { name: 'Conversation' })).getAllByRole('listitem');
  return items[items.length - 1];
};

const requestAt = (call: number): ChatRequest => stream.mock.calls[call][0];

// jsdom reports errors thrown during render to window "error"; the boundary handles them.
const swallowRenderError = (event: ErrorEvent) => event.preventDefault();

describe('ChatBot', () => {
  let restoreRects: () => void;

  beforeAll(async () => {
    // Warm the lazy chunk so React.lazy resolves within the default findBy timeout.
    await import('./ChatPanel');
  });

  beforeEach(() => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-test');
    stream.mockReset();
    stream.mockImplementation(async () => bufferedStream('Hello world'));
    restoreRects = stubClientRects();
  });

  afterEach(() => {
    restoreRects();
    vi.restoreAllMocks();
    __setChatPanelImporterForTests();
    window.removeEventListener('error', swallowRenderError);
    window.history.replaceState(null, '', '/');
    document.documentElement.style.overflow = '';
  });

  it('renders nothing and warns once when the assistant is not configured', () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', '');
    vi.stubEnv('VITE_CHATBOT_AGENT_MODEL', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { container, rerender } = render(<ChatBot />);
    rerender(<ChatBot />);

    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^\[portfolio-assistant\] disabled: Missing VITE_CHAT_PORTFOLIO_AGENT_ID/);
  });

  it('shows an "Ask about my work" launcher that opens a dialog', () => {
    renderPage();
    const button = screen.getByRole('button', { name: 'Ask about my work' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the panel, hides the launcher and focuses the composer with a fine pointer', async () => {
    renderPage();
    const dialog = await openChat();

    expect(dialog).toHaveAccessibleDescription(/can be wrong/);
    expect(dialog).toHaveAttribute('id', 'portfolio-assistant');
    expect(screen.queryByRole('button', { name: LAUNCHER_NAME })).toBeNull();
    expect(chatRootButton()).toHaveAttribute('aria-controls', 'portfolio-assistant');
    await waitFor(() => expect(document.activeElement).toBe(composer()));
  });

  it('focuses the dialog itself with a coarse pointer, so no keyboard pops up', async () => {
    renderPage({ coarse: true });
    const dialog = await openChat();
    await waitFor(() => expect(document.activeElement).toBe(dialog));
  });

  it('has exactly one disclosure, referenced by the composer', async () => {
    renderPage();
    await openChat();
    expect(screen.getAllByText(/external AI service/)).toHaveLength(1);
    expect(composer().getAttribute('aria-describedby')?.split(' ')).toContain('chat-disclosure');

    typeAndSend('Hi');
    await screen.findByText('Hello world');
    expect(screen.getAllByText(/external AI service/)).toHaveLength(1);

    // The counter shares the disclosure row but never becomes part of the dialog's description.
    fireEvent.change(composer(), { target: { value: 'a'.repeat(1700) } });
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toHaveAccessibleDescription(DISCLOSURE_TEXT);
    expect(composer()).toHaveAccessibleDescription(`${DISCLOSURE_TEXT} 1,700 / 2,000`);
  });

  it('sends a welcome chip as the full prompt and keeps focus in the composer', async () => {
    renderPage();
    await openAndFocus();

    const chips = within(screen.getByRole('group', { name: 'Try asking' })).getAllByRole('button');
    expect(chips).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Tour the featured work' }));
    expect(await screen.findByText("Give me a quick tour of Andres's featured projects.")).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Try asking' })).toBeNull();
    expect(document.activeElement).toBe(composer());
  });

  it('keeps focus in an enabled composer while streaming, with one Send/Stop button', async () => {
    const controlled = createControlledStream();
    stream.mockImplementation(async () => controlled.stream);
    renderPage();
    const dialog = await openAndFocus();

    typeAndSend('Hi');
    const stop = await screen.findByRole('button', { name: 'Stop answer' });
    expect(composer()).not.toBeDisabled();
    expect(document.activeElement).toBe(composer());

    controlled.push('Hello');
    await within(dialog).findByText('Hello');
    expect(document.activeElement).toBe(composer());
    expect(composer()).not.toBeDisabled();
    expect(within(dialog).getByText('Answering…')).toBeInTheDocument(); // header status line

    controlled.push(' world');
    controlled.close();
    const send = await screen.findByRole('button', { name: 'Send message' });
    expect(send).toBe(stop);
    expect(send).toHaveAttribute('aria-disabled', 'true');
    expect(document.activeElement).toBe(composer());
    expect(within(dialog).getByText('AI · Answers from this site')).toBeInTheDocument();
    expect(within(dialog).queryByText('Answering…')).toBeNull();
  });

  it('announces through one status region and never makes the transcript live', async () => {
    const controlled = createControlledStream();
    stream.mockImplementation(async () => controlled.stream);
    renderPage();
    expect(screen.getAllByRole('status')).toHaveLength(1);

    const dialog = await openChat();
    typeAndSend('Hi');
    await waitFor(() => expect(status()).toHaveTextContent('Assistant is thinking.'));
    expect(lastAssistantTurn()).toHaveAttribute('aria-busy', 'true');
    expect(dialog.querySelector('[aria-live]')).toBeNull();
    expect(dialog.querySelector('[role="log"]')).toBeNull();
    expect(dialog).not.toContainElement(status());

    controlled.push('Hello world');
    controlled.close();
    await waitFor(() => expect(status()).toHaveTextContent('Assistant replied: Hello world'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('labels turns with h3 speaker headings', async () => {
    renderPage();
    await openChat();
    typeAndSend('Hi');
    await waitFor(() => expect(lastAssistantTurn()).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'You',
      'Assistant',
    ]);
  });

  it('hides without stopping the answer, marks the launcher unread and shows the full reply on reopen', async () => {
    const controlled = createControlledStream();
    stream.mockImplementation(async () => controlled.stream);
    renderPage();
    await openAndFocus();

    typeAndSend('Hi');
    await screen.findByRole('button', { name: 'Stop answer' });
    fireEvent.keyDown(composer(), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(launcher()));
    expect(controlled.cancelled).toBe(false);

    controlled.push('Hello world');
    controlled.close();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Ask about my work, new reply/ })).toBeInTheDocument(),
    );
    await waitFor(() => expect(status()).toHaveTextContent('The portfolio assistant replied.'));

    fireEvent.click(launcher());
    const dialog = await screen.findByRole('dialog', { name: 'Portfolio assistant' });
    expect(within(dialog).getByText('Hello world')).toBeInTheDocument();
    expect(within(dialog).queryByText('Stopped')).toBeNull();
    expect(chatRootButton()).not.toHaveTextContent('new reply');
  });

  it('hides on Escape after a completed answer, but leaves Escape in other page controls alone', async () => {
    renderPage();
    await openAndFocus();
    typeAndSend('Hi');
    await screen.findByText('Hello world');

    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(launcher());
    await screen.findByRole('dialog', { name: 'Portfolio assistant' });
    const search = screen.getByRole('textbox', { name: 'Search projects' });
    search.focus();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();
  });

  it('stands aside for Escape while a Radix dialog is open', async () => {
    renderPage();
    await openAndFocus();
    const layer = document.createElement('div');
    layer.setAttribute('data-slot', 'dialog-content');
    document.body.append(layer);

    fireEvent.keyDown(composer(), { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();
    layer.remove();
  });

  it('confirms New chat inline with managed focus, and Escape closes only the confirmation', async () => {
    renderPage();
    await openAndFocus();
    typeAndSend('Hi');
    await screen.findByText('Hello world');

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(screen.getByRole('group', { name: 'Clear this conversation?' })).toBeInTheDocument();
    expect(document.activeElement).toBe(cancel);
    // The question takes the title's place on screen; the h2 still names the dialog.
    expect(screen.getByRole('heading', { level: 2, name: 'Portfolio assistant' }).parentElement).toHaveClass('sr-only');
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();

    fireEvent.keyDown(cancel, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Clear this conversation?' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New chat' }));
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('group', { name: 'Try asking' })).toBeInTheDocument();
    expect(screen.queryByText('Hello world')).toBeNull();
    expect(document.activeElement).toBe(composer());
    await waitFor(() => expect(status()).toHaveTextContent('Conversation cleared.'));
  });

  it('New chat aborts a running answer', async () => {
    const controlled = createControlledStream();
    stream.mockImplementation(async () => controlled.stream);
    renderPage();
    await openAndFocus();
    typeAndSend('Hi');
    await screen.findByRole('button', { name: 'Stop answer' });

    fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(controlled.cancelled).toBe(true));
    expect(screen.getByRole('group', { name: 'Try asking' })).toBeInTheDocument();
  });

  it('Stop keeps the partial answer and offers Retry, which focuses the composer', async () => {
    const controlled = createControlledStream();
    stream.mockImplementationOnce(async () => controlled.stream);
    renderPage();
    await openAndFocus();

    typeAndSend('Hi');
    controlled.push('Partial');
    await screen.findByText('Partial');
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 1_000); // past the composer's double-click guard
    fireEvent.click(screen.getByRole('button', { name: 'Stop answer' }));
    vi.mocked(Date.now).mockRestore();

    expect(within(lastAssistantTurn()).getByText('Stopped')).toBeInTheDocument();
    await waitFor(() => expect(status()).toHaveTextContent('Answer stopped. The partial answer is kept.'));

    const retry = screen.getByRole('button', { name: 'Retry' });
    retry.focus();
    fireEvent.click(retry);
    expect(document.activeElement).toBe(composer());
    await screen.findByText('Hello world');
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it('offers Retry only on the last turn and marks older failures "Not answered"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // DEV-only error logging
    stream.mockRejectedValueOnce(
      new ChatServiceError('Chat service request failed with 503 Service Unavailable', { status: 503 }),
    );
    renderPage();
    await openAndFocus();

    typeAndSend('A');
    await screen.findByText('The assistant is unavailable right now.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    typeAndSend('B');
    await screen.findByText('Hello world');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByText('Not answered')).toBeInTheDocument();
    expect(requestAt(1).messages.slice(1)).toEqual([{ role: 'user', content: 'A\n\nB' }]);
  });

  it('opens a linked project in the page and cards it after the answer completes', async () => {
    stream.mockImplementation(async () => bufferedStream('See [FindIT](?project=findit).'));
    const pushState = vi.spyOn(window.history, 'pushState');
    renderPage();
    await openChat();
    typeAndSend('Hi');

    const link = await screen.findByRole('link', { name: /^FindIT ?\(project details\)$/ });
    expect(link).not.toHaveAttribute('target');
    fireEvent.click(link);
    expect(pushState).toHaveBeenCalledWith(PROJECT_MODAL_HISTORY_STATE, '', expect.objectContaining({ search: '?project=findit' }));
    await waitFor(() => expect(status()).toHaveTextContent('Opened FindIT.'));

    const cards = screen.getByRole('list', { name: 'Projects in this answer' });
    expect(within(cards).getAllByRole('listitem')).toHaveLength(1);
    expect(within(cards).getByRole('link', { name: 'Open details: FindIT' })).toBeInTheDocument();
  });

  it('applies a filter link in place in the floating layout and keeps focus in the chat', async () => {
    stream.mockImplementation(async () => bufferedStream('Try [Agents](?category=agents-llm).'));
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);
    renderPage();
    const dialog = await openChat();
    typeAndSend('Hi');

    const link = await screen.findByRole('link', { name: /^Agents ?\(filters the project list\)$/ });
    link.focus();
    fireEvent.click(link);

    expect(replaceState).toHaveBeenCalledWith(null, '', expect.objectContaining({ search: '?category=agents-llm' }));
    expect(scrollIntoView.mock.contexts).toContain(document.getElementById('projects'));
    await waitFor(() => expect(status()).toHaveTextContent(/Showing \d+ Agents & LLM Tooling projects\./));
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();
  });

  it('hides the sheet for a filter link and focuses the Work heading', async () => {
    stream.mockImplementation(async () => bufferedStream('Try [Agents](?category=agents-llm).'));
    renderPage({ sheet: true });
    await openChat();
    typeAndSend('Hi');

    fireEvent.click(await screen.findByRole('link', { name: /Agents/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('projects-heading')));
    expect(window.location.search).toBe('?category=agents-llm');
  });

  it('renders only safe links and never loads model images', async () => {
    stream.mockImplementation(async () =>
      bufferedStream('Try [FindIT](https://findit.moe/) or [x](https://evil.example). ![x](https://evil.example/p.png)'),
    );
    renderPage();
    const dialog = await openChat();
    typeAndSend('Hi');

    const external = await screen.findByRole('link', { name: /^FindIT ?\(opens in new tab\)$/ });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(dialog).queryByRole('link', { name: 'x' })).toBeNull();
    expect(dialog.querySelector('a[href^="https://evil.example"]')).toBeNull();
    expect(dialog.querySelector('img')).toBeNull();
    expect(within(dialog).getByText('[x]')).toBeInTheDocument();
  });

  it('shows the visitor message literally', async () => {
    renderPage();
    await openChat();
    typeAndSend('*args* and 1. first');
    const bubble = await screen.findByText('*args* and 1. first');
    expect(bubble.tagName).toBe('P');
  });

  it('shows a plain-language error with fallbacks and no raw details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // DEV-only error logging
    stream.mockRejectedValueOnce(
      new ChatServiceError('Chat service request failed with 503 Service Unavailable', { status: 503 }),
    );
    renderPage();
    const dialog = await openChat();
    typeAndSend('Hi');

    await within(dialog).findByText('The assistant is unavailable right now.');
    expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Email Andres' })).toHaveAttribute('href', 'mailto:andres@arz.ai');
    expect(dialog).not.toHaveTextContent('503');
    expect(dialog).not.toHaveTextContent('Chat service request failed');
    await waitFor(() => expect(status()).toHaveTextContent('The assistant is unavailable right now. Retry is available.'));
  });

  it('isolates the page in the sheet layout and restores it on hide', async () => {
    renderPage({ sheet: true });
    const dialog = await openChat();
    const main = document.getElementById('main') as HTMLElement;

    // Isolation comes from `inert`, not aria-modal, so the announcer outside the frame stays audible in WebKit.
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(dialog.contains(status())).toBe(false);
    expect(dialog).toHaveAttribute('data-layout', 'sheet');
    expect(main).toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(status().closest('[inert]')).toBeNull();

    const send = screen.getByRole('button', { name: 'Send message' });
    send.focus();
    fireEvent.keyDown(send, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close assistant' }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(send);

    fireEvent.keyDown(send, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(main).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('stays non-modal in the floating layout', async () => {
    renderPage();
    const dialog = await openChat();
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(document.getElementById('main')).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('opens focused on a project from askAssistant without sending anything', async () => {
    renderPage();
    act(() => askAssistant({ projectSlug: 'findit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Portfolio assistant' });
    expect(await within(dialog).findByText('Ask about FindIT')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Try asking' })).getAllByRole('button')).toHaveLength(4);
    expect(composer()).toHaveAttribute('placeholder', 'Ask about FindIT…');
    expect(stream).not.toHaveBeenCalled();

    typeAndSend('What stack?');
    await screen.findByText('Hello world');
    expect(requestAt(0).messages[0].content).toContain('## CURRENT CONTEXT');
    expect(screen.getByRole('button', { name: 'Stop focusing on FindIT' })).toBeInTheDocument();
  });

  it('shows project chips in the context bar after an ask mid-conversation, without interrupting the answer', async () => {
    const controlled = createControlledStream();
    stream.mockImplementationOnce(async () => controlled.stream);
    renderPage();
    await openAndFocus();
    typeAndSend('Hi');
    await screen.findByRole('button', { name: 'Stop answer' });

    act(() => askAssistant({ projectSlug: 'findit' }));
    const chips = await screen.findByRole('group', { name: 'Questions about FindIT' });
    expect(screen.getByRole('button', { name: 'Stop answer' })).toBeInTheDocument();

    // Mid-answer a chip sends nothing and says why.
    fireEvent.click(within(chips).getByRole('button', { name: 'What problem does it solve?' }));
    expect(document.activeElement).toBe(composer());
    await waitFor(() => expect(status()).toHaveTextContent('Still answering. Stop it or wait.'));
    expect(stream).toHaveBeenCalledTimes(1);

    controlled.push('Done');
    controlled.close();
    await screen.findByRole('button', { name: 'Send message' });
    fireEvent.click(within(chips).getByRole('button', { name: 'What problem does it solve?' }));
    expect(await screen.findByText('What problem does FindIT solve?')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Questions about FindIT' })).toBeNull();
    expect(requestAt(1).messages[0].content).toContain('## CURRENT CONTEXT');
  });

  it('drops an abandoned project focus when a general ask opens an empty conversation', async () => {
    renderPage();
    act(() => askAssistant({ projectSlug: 'findit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Portfolio assistant' });
    expect(await within(dialog).findByText('Ask about FindIT')).toBeInTheDocument();
    fireEvent.keyDown(composer(), { key: 'Escape' });
    await waitFor(() => expect(dialog).toHaveAttribute('hidden'));

    // The Intro CTA: no project named.
    act(() => askAssistant());

    await waitFor(() => expect(dialog).not.toHaveAttribute('hidden'));
    expect(await within(dialog).findByText('Ask the portfolio')).toBeInTheDocument();
    expect(within(dialog).queryByText('Ask about FindIT')).toBeNull();
    expect(composer()).toHaveAttribute('placeholder', 'Ask about a project, a technology or availability…');
    expect(stream).not.toHaveBeenCalled();

    typeAndSend('Hi');
    await screen.findByText('Hello world');
    expect(requestAt(0).messages[0].content).not.toContain('## CURRENT CONTEXT');
  });

  it('keeps the project focus of a running conversation on a general ask', async () => {
    renderPage();
    act(() => askAssistant({ projectSlug: 'findit' }));
    await screen.findByRole('dialog', { name: 'Portfolio assistant' });
    await screen.findByText('Ask about FindIT');
    typeAndSend('What stack?');
    await screen.findByText('Hello world');

    act(() => askAssistant());

    // The context bar still offers its own "Stop focusing" control.
    expect(await screen.findByRole('button', { name: 'Stop focusing on FindIT' })).toBeInTheDocument();
    expect(composer()).toHaveAttribute('placeholder', 'Ask about FindIT…');
  });

  it('moves focus into an already open panel when an ask arrives from the page', async () => {
    renderPage();
    await openAndFocus();
    const search = screen.getByRole('textbox', { name: 'Search projects' });
    search.focus();

    act(() => askAssistant({ projectSlug: 'findit' }));
    await waitFor(() => expect(document.activeElement).toBe(composer()));
    expect(await screen.findByText('Ask about FindIT')).toBeInTheDocument();

    // Hiding returns focus to the control the ask came from.
    fireEvent.keyDown(composer(), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(search));
  });

  it('waits for an open project modal to close before opening', async () => {
    renderPage();
    const layer = document.createElement('div');
    layer.setAttribute('data-slot', 'dialog-content');
    document.body.append(layer);

    act(() => askAssistant({ projectSlug: 'findit' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog')).toBeNull();

    layer.remove();
    expect(await screen.findByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();
  });

  it('keeps a failed panel chunk inside the frame and loads it on "Try again"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', swallowRenderError);
    let fail = true;
    __setChatPanelImporterForTests(() =>
      fail ? Promise.reject(new Error('Failed to fetch dynamically imported module')) : import('./ChatPanel'),
    );
    renderPage();

    fireEvent.click(launcher());
    expect(await screen.findByText("The assistant couldn't load.")).toBeInTheDocument();
    expect(document.getElementById('main')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Portfolio assistant' })).toBeInTheDocument();

    // A rejected import, the boundary and a remount sit between these steps: allow for a busy test machine.
    await waitFor(() => expect(status()).toHaveTextContent("The assistant couldn't load."), { timeout: 5_000 });

    // A retry that fails again must not strand focus on <body>.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' })), {
      timeout: 5_000,
    });

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('textbox', { name: 'Message the portfolio assistant' })).toBeInTheDocument();
    expect(screen.queryByText("The assistant couldn't load.")).toBeNull();
  });

  it('offers "Larger panel" only on wide fine-pointer screens in the floating layout', async () => {
    renderPage({ expand: true });
    const dialog = await openChat();
    const toggle = screen.getByRole('button', { name: 'Larger panel' });

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(dialog.style.getPropertyValue('--chat-w')).toBe('26rem');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(dialog.style.getPropertyValue('--chat-w')).toBe('44rem');
    expect(dialog.style.getPropertyValue('--chat-h')).toBe('100dvh');
  });

  it('drops back to the regular size when "Larger panel" stops being offered', async () => {
    const { media } = renderPage({ expand: true });
    const dialog = await openChat();
    fireEvent.click(screen.getByRole('button', { name: 'Larger panel' }));
    expect(dialog.style.getPropertyValue('--chat-w')).toBe('44rem');

    // The window narrows below 992 px: the toggle disappears, so the panel cannot stay stuck large.
    act(() => media.set({ expand: false }));
    expect(screen.queryByRole('button', { name: 'Larger panel' })).toBeNull();
    expect(dialog.style.getPropertyValue('--chat-w')).toBe('26rem');
    expect(dialog.style.getPropertyValue('--chat-h')).toBe('40rem');

    act(() => media.set({ expand: true }));
    expect(screen.getByRole('button', { name: 'Larger panel' })).toHaveAttribute('aria-pressed', 'true');
    expect(dialog.style.getPropertyValue('--chat-w')).toBe('44rem');
  });

  it('has no "Larger panel" toggle without the wide-screen query', async () => {
    renderPage();
    await openChat();
    expect(screen.queryByRole('button', { name: 'Larger panel' })).toBeNull();
  });

  it('has no "Larger panel" toggle in the sheet layout, even on a wide fine-pointer screen', async () => {
    renderPage({ expand: true, sheet: true });
    await openChat();
    expect(screen.queryByRole('button', { name: 'Larger panel' })).toBeNull();
  });
});
