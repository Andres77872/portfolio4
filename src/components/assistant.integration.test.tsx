import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }));

vi.mock('@/services/chatService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/chatService')>()),
  streamChatCompletion: streamMock,
}));

import type { streamChatCompletion } from '@/services/chatService';
import { stubClientRects } from '@/test/dom';
import { mockMatchMedia } from '@/test/media';
import { bufferedStream } from '@/test/streams';

import ChatBot from './ChatBot/ChatBot';
import Intro from './Intro';
import Projects from './Projects/Projects';

const stream = streamMock as unknown as Mock<typeof streamChatCompletion>;

function renderSite() {
  mockMatchMedia();
  return render(
    <>
      <main id="main">
        <Intro />
        <Projects />
      </main>
      <ChatBot />
    </>,
  );
}

const composer = () => screen.getByRole('textbox', { name: 'Message the portfolio assistant' });
const chatDialog = () => screen.findByRole('dialog', { name: 'Portfolio assistant' });
const projectDialog = () => screen.findByRole('dialog', { name: 'FindIT' });

describe('assistant entry points on the site', () => {
  let restoreRects: () => void;

  beforeAll(async () => {
    // Warm both lazy chunks so they resolve within the default findBy timeout.
    await Promise.all([import('./ChatBot/ChatPanel'), import('./Projects/ProjectModal')]);
  });

  beforeEach(() => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-test');
    stream.mockReset();
    stream.mockImplementation(async () => bufferedStream('See [FindIT](?project=findit).'));
    restoreRects = stubClientRects();
  });

  afterEach(() => {
    restoreRects();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    document.title = '';
  });

  it('"Ask about this project" closes the modal and opens the chat focused on it, without sending', async () => {
    window.history.replaceState(null, '', '/?project=findit');
    renderSite();
    const modal = await projectDialog();

    fireEvent.click(within(modal).getByRole('button', { name: 'Ask about this project' }));

    const dialog = await chatDialog();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'FindIT' })).toBeNull());
    expect(window.location.search).toBe('');
    expect(await within(dialog).findByText('Ask about FindIT')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(composer()));
    expect(composer()).toHaveAttribute('placeholder', 'Ask about FindIT…');
    expect(stream).not.toHaveBeenCalled();
  });

  it('returns focus to a project card after its modal closes through Back', async () => {
    renderSite();
    const card = screen
      .getAllByRole('link', { name: 'FindIT' })
      .find((link) => link.closest('#projects')) as HTMLAnchorElement;
    card.focus();
    fireEvent.click(card);
    await projectDialog();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'FindIT' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(card));
    expect(window.location.search).toBe('');
  });

  it('opens the chat from the Intro call to action and returns focus there on hide', async () => {
    renderSite();
    const cta = screen.getByRole('button', { name: 'Ask the assistant' });
    cta.focus();
    fireEvent.click(cta);

    await chatDialog();
    await waitFor(() => expect(document.activeElement).toBe(composer()));

    fireEvent.keyDown(composer(), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(cta));
    expect(stream).not.toHaveBeenCalled();
  });

  it('opens a project from a chat link over the chat and returns focus to that link', async () => {
    renderSite();
    fireEvent.click(screen.getByRole('button', { name: /^Ask about my work/ }));
    const chat = await chatDialog();
    await waitFor(() => expect(document.activeElement).toBe(composer()));
    fireEvent.change(composer(), { target: { value: 'Best search project?' } });
    fireEvent.keyDown(composer(), { key: 'Enter' });

    const link = await within(chat).findByRole('link', { name: /^FindIT/ });
    link.focus();
    fireEvent.click(link);
    const modal = await projectDialog();

    // Escape belongs to the modal: the chat stays open underneath.
    fireEvent.keyDown(within(modal).getByRole('button', { name: 'Ask about this project' }), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'FindIT' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(link));
    expect(chat).not.toHaveAttribute('hidden');
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it('asks about a project from a modal opened out of the chat, keeping the conversation', async () => {
    renderSite();
    const cta = screen.getByRole('button', { name: 'Ask the assistant' });
    cta.focus();
    fireEvent.click(cta);
    const chat = await chatDialog();
    await waitFor(() => expect(document.activeElement).toBe(composer()));
    fireEvent.change(composer(), { target: { value: 'Best search project?' } });
    fireEvent.keyDown(composer(), { key: 'Enter' });
    const link = await within(chat).findByRole('link', { name: /^FindIT/ });
    link.focus();
    fireEvent.click(link);
    const modal = await projectDialog();

    fireEvent.click(within(modal).getByRole('button', { name: 'Ask about this project' }));

    expect(await within(chat).findByRole('group', { name: 'Questions about FindIT' })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(composer()));
    expect(within(chat).getByText('Best search project?')).toBeInTheDocument();
    expect(stream).toHaveBeenCalledTimes(1);

    // The ask came with focus on <body>, so the chat keeps the control that opened it.
    fireEvent.keyDown(composer(), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(cta));
  });
});
