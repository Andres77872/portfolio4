import { act, renderHook, waitFor } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { ChatServiceError, type streamChatCompletion } from '@/services/chatService';
import type { ChatRequest, ChatServiceOptions } from '@/services/chatTypes';
import { bufferedStream, createControlledStream, sseResponse } from '@/test/streams';

import { MAX_INPUT_CHARS } from '../constants';
import type { AssistantTurn } from '../conversation';
import { useChat, type UseChatOptions, type UseChatResult } from './useChat';

type StreamFn = typeof streamChatCompletion;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const requestAt = (stream: ReturnType<typeof vi.fn<StreamFn>>, call: number): ChatRequest =>
  stream.mock.calls[call][0];

const optionsAt = (stream: ReturnType<typeof vi.fn<StreamFn>>, call: number): ChatServiceOptions | undefined =>
  stream.mock.calls[call][1];

const withoutSystem = (request: ChatRequest) => request.messages.slice(1);

/**
 * Regression block for the dropped-token / never-complete bug. It runs like the app does:
 * a real createRoot, React's real scheduler (no act) and real timers, so state updates are
 * applied lazily, exactly where the old ref-in-updater check failed.
 */
describe('useChat under the real React scheduler (regression)', () => {
  const globals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let previousActEnvironment: boolean | undefined;
  const mounted: Array<() => void> = [];

  const mountProbe = async (options: UseChatOptions) => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const latest: { current: UseChatResult | null } = { current: null };

    function Probe() {
      latest.current = useChat(options);
      return null;
    }

    root.render(<Probe />);
    mounted.push(() => {
      root.unmount();
      container.remove();
    });
    await vi.waitFor(() => expect(latest.current).not.toBeNull());

    return {
      get chat() {
        return latest.current as UseChatResult;
      },
    };
  };

  beforeEach(() => {
    previousActEnvironment = globals.IS_REACT_ACT_ENVIRONMENT;
    globals.IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterEach(() => {
    while (mounted.length > 0) mounted.pop()?.();
    globals.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it('completes a fully buffered body with the whole text', async () => {
    const probe = await mountProbe({ stream: vi.fn<StreamFn>(async () => bufferedStream('Hel', 'lo')) });

    expect(probe.chat.send('Hi')).toEqual({ ok: true });

    await vi.waitFor(() =>
      expect(probe.chat.items).toEqual([
        expect.objectContaining({ role: 'user', content: 'Hi' }),
        expect.objectContaining({ role: 'assistant', content: 'Hello', status: 'complete' }),
      ]),
    );
    expect(probe.chat.busy).toBe(false);
  });

  it('completes spaced chunks whose close arrives in its own task', async () => {
    for (let count = 1; count <= 8; count += 1) {
      const controlled = createControlledStream();
      const probe = await mountProbe({ stream: vi.fn<StreamFn>(async () => controlled.stream) });
      const words = Array.from({ length: count }, (_, index) => `w${index} `);

      probe.chat.send('Hi');
      for (const word of words) {
        await sleep(20);
        controlled.push(word);
      }
      await sleep(0);
      controlled.close();

      await vi.waitFor(() =>
        expect(probe.chat.items[1]).toMatchObject({ status: 'complete', content: words.join('') }),
      );
      expect(probe.chat.busy).toBe(false);
    }
  });

  it('keeps the last chunk when it arrives in the same task as the close', async () => {
    const controlled = createControlledStream();
    const probe = await mountProbe({ stream: vi.fn<StreamFn>(async () => controlled.stream) });

    probe.chat.send('Hi');
    await sleep(20);
    controlled.push('Hello');
    await sleep(20);
    controlled.push(' world');
    controlled.close();

    await vi.waitFor(() => expect(probe.chat.items[1]).toMatchObject({ status: 'complete', content: 'Hello world' }));
  });

  it('completes a second turn and never leaves the first one streaming', async () => {
    const second = createControlledStream();
    const stream = vi
      .fn<StreamFn>()
      .mockImplementationOnce(async () => bufferedStream('First answer'))
      .mockImplementationOnce(async () => second.stream);
    const probe = await mountProbe({ stream });

    probe.chat.send('One');
    await vi.waitFor(() => expect(probe.chat.items[1]).toMatchObject({ status: 'complete' }));

    expect(probe.chat.send('Two')).toEqual({ ok: true });
    await vi.waitFor(() => expect(probe.chat.items[3]).toMatchObject({ status: 'pending' }));
    await sleep(20);
    second.push('Second ');
    await sleep(20);
    second.push('answer');
    await sleep(0);
    second.close();

    await vi.waitFor(() => expect(probe.chat.items[3]).toMatchObject({ status: 'complete', content: 'Second answer' }));
    expect(probe.chat.items[1]).toMatchObject({ status: 'complete', content: 'First answer' });
    expect(probe.chat.busy).toBe(false);
  });

  describe('through the real chat service (stubbed fetch)', () => {
    const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;
    let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

    beforeEach(() => {
      vi.stubEnv('VITE_CHAT_API_URL', 'https://example.test/completions');
      vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-test');
      fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('completes when the last delta, [DONE] and the close arrive in one chunk', async () => {
      fetchMock.mockResolvedValue(sseResponse([delta('Hel'), delta('lo'), 'data: [DONE]']));
      const probe = await mountProbe({});

      probe.chat.send('Hi');

      await vi.waitFor(() => expect(probe.chat.items[1]).toMatchObject({ status: 'complete', content: 'Hello' }));
      expect(fetchMock).toHaveBeenCalledWith('https://example.test/completions', expect.anything());
      expect(probe.chat.busy).toBe(false);
    });

    it('keeps the text that preceded an in-band error in the same chunk', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      fetchMock.mockResolvedValue(sseResponse([delta('Hel'), delta('lo'), 'data: {"error":{"message":"boom"}}']));
      const probe = await mountProbe({});

      probe.chat.send('Hi');

      await vi.waitFor(() =>
        expect(probe.chat.items[1]).toMatchObject({ status: 'error', error: 'interrupted', content: 'Hello' }),
      );
    });
  });
});

describe('useChat', () => {
  let stream: ReturnType<typeof vi.fn<StreamFn>>;

  const renderChat = (options: Partial<UseChatOptions> = {}) =>
    renderHook((props: Partial<UseChatOptions>) => useChat({ stream, ...props }), { initialProps: options });

  beforeEach(() => {
    stream = vi.fn<StreamFn>();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stop() keeps unflushed text, ignores later chunks, aborts and cancels the reader', async () => {
    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    const { result } = renderChat();

    act(() => {
      result.current.send('A');
    });
    await act(async () => {
      controlled.push('Hel');
      await sleep(0);
    });
    // Read by the runner but still inside the 40 ms batch window.
    expect(result.current.items[1]).toMatchObject({ status: 'pending', content: '' });

    act(() => result.current.stop());

    expect(result.current.items[1]).toMatchObject({ status: 'stopped', content: 'Hel' });
    expect(result.current.busy).toBe(false);
    expect(optionsAt(stream, 0)?.signal?.aborted).toBe(true);

    await act(async () => {
      controlled.push('lo');
      await sleep(60);
    });
    expect(result.current.items[1]).toMatchObject({ status: 'stopped', content: 'Hel' });
    expect(controlled.cancelled).toBe(true);

    stream.mockResolvedValueOnce(bufferedStream('ok'));
    act(() => {
      expect(result.current.send('B')).toEqual({ ok: true });
    });
    expect(withoutSystem(requestAt(stream, 1))).toEqual([{ role: 'user', content: 'A\n\nB' }]);
    await waitFor(() => expect(result.current.items[3]).toMatchObject({ status: 'complete', content: 'ok' }));
  });

  it('rejects sends while busy, blank sends and over-long sends', async () => {
    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    const { result } = renderChat();

    act(() => {
      expect(result.current.send('First')).toEqual({ ok: true });
    });
    act(() => {
      expect(result.current.send('Second')).toEqual({ ok: false, reason: 'busy' });
    });
    expect(stream).toHaveBeenCalledTimes(1);

    act(() => {
      expect(result.current.send(' ')).toEqual({ ok: false, reason: 'empty' });
      expect(result.current.send('x'.repeat(MAX_INPUT_CHARS + 1))).toEqual({ ok: false, reason: 'too-long' });
    });

    await act(async () => {
      controlled.close();
      await sleep(0);
    });
  });

  it('sends the system prompt, then the sanitized history, as the portfolio assistant', async () => {
    stream.mockResolvedValueOnce(bufferedStream('Hello'));
    const { result } = renderChat({ getSystem: undefined });

    act(() => {
      result.current.send('  Hi  ');
    });

    const request = requestAt(stream, 0);
    expect(request.messages[0].role).toBe('system');
    expect(request.messages[0].content).toContain('## RULES');
    expect(withoutSystem(request)).toEqual([{ role: 'user', content: 'Hi' }]);
    expect(optionsAt(stream, 0)?.consumer).toBe(CHAT_CONSUMERS.PORTFOLIO_ASSISTANT);
    expect(optionsAt(stream, 0)?.consumer).toBe('portfolio-assistant');
    expect(result.current.items[0]).toMatchObject({ role: 'user', content: 'Hi' });
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it('classifies a 503 as unavailable and leaves no empty assistant in the next request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stream.mockRejectedValueOnce(new ChatServiceError('Chat service request failed with status 503.', { status: 503 }));
    const { result } = renderChat();

    act(() => {
      result.current.send('A');
    });
    await waitFor(() => expect(result.current.items[1]).toMatchObject({ status: 'error', error: 'unavailable' }));

    stream.mockResolvedValueOnce(bufferedStream('Answer'));
    act(() => {
      result.current.send('B');
    });

    expect(withoutSystem(requestAt(stream, 1))).toEqual([{ role: 'user', content: 'A\n\nB' }]);
    await waitFor(() => expect(result.current.items[3]).toMatchObject({ status: 'complete' }));
  });

  it('retries a failed last turn in place with the history cut at its question', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stream.mockRejectedValueOnce(new ChatServiceError('x', { status: 503 }));
    const { result } = renderChat();

    act(() => {
      result.current.send('A');
    });
    await waitFor(() => expect(result.current.items[1]).toMatchObject({ status: 'error' }));
    const failedId = result.current.items[1].id;

    stream.mockResolvedValueOnce(bufferedStream('Answer'));
    act(() => result.current.retry(failedId));

    expect(withoutSystem(requestAt(stream, 1))).toEqual([{ role: 'user', content: 'A' }]);
    await waitFor(() =>
      expect(result.current.items).toEqual([
        expect.objectContaining({ role: 'user', content: 'A' }),
        expect.objectContaining({ role: 'assistant', status: 'complete', content: 'Answer' }),
      ]),
    );
    expect(result.current.items[1].id).not.toBe(failedId);
  });

  it('ignores retry for a failed turn that is no longer last', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stream.mockRejectedValueOnce(new ChatServiceError('x', { status: 503 }));
    const { result } = renderChat();

    act(() => {
      result.current.send('A');
    });
    await waitFor(() => expect(result.current.items[1]).toMatchObject({ status: 'error' }));
    const failedId = result.current.items[1].id;

    stream.mockResolvedValueOnce(bufferedStream('B answer'));
    act(() => {
      result.current.send('B');
    });
    await waitFor(() => expect(result.current.items[3]).toMatchObject({ status: 'complete' }));

    act(() => result.current.retry(failedId));
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it('times out after 45 s without bytes, and reports partial answers as interrupted', async () => {
    vi.useFakeTimers();
    const silent = createControlledStream();
    stream.mockResolvedValueOnce(silent.stream);
    const { result } = renderChat();

    act(() => {
      result.current.send('Hi');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(44_000);
    });
    expect(result.current.items[1]).toMatchObject({ status: 'pending' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.items[1]).toMatchObject({ status: 'error', error: 'timeout' });
    expect(optionsAt(stream, 0)?.signal?.aborted).toBe(true);

    const partial = createControlledStream();
    stream.mockResolvedValueOnce(partial.stream);
    act(() => {
      result.current.send('Again');
    });
    await act(async () => {
      partial.push('Hel');
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.items[3]).toMatchObject({ status: 'streaming', content: 'Hel' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });
    expect(result.current.items[3]).toMatchObject({ status: 'error', error: 'interrupted', content: 'Hel' });
    expect(optionsAt(stream, 1)?.signal?.aborted).toBe(true);
  });

  it('reset() mid-stream clears the conversation and drops late chunks', async () => {
    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    const { result } = renderChat();

    act(() => {
      result.current.send('Hi');
    });
    await act(async () => {
      controlled.push('Hel');
      await sleep(60);
    });
    expect(result.current.items[1]).toMatchObject({ content: 'Hel' });

    act(() => result.current.reset());
    expect(result.current.items).toEqual([]);
    expect(result.current.busy).toBe(false);

    await act(async () => {
      controlled.push('lo');
      controlled.close();
      await sleep(60);
    });
    expect(result.current.items).toEqual([]);
    expect(optionsAt(stream, 0)?.signal?.aborted).toBe(true);
  });

  it('marks a zero-content answer as empty', async () => {
    stream.mockResolvedValueOnce(bufferedStream());
    const { result } = renderChat();

    act(() => {
      result.current.send('Hi');
    });

    await waitFor(() => expect(result.current.items[1]).toMatchObject({ status: 'error', error: 'empty' }));
  });

  it('keeps partial content when the stream errors mid-answer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    const { result } = renderChat();

    act(() => {
      result.current.send('Hi');
    });
    await act(async () => {
      controlled.push('Hel');
      await sleep(0);
      controlled.error(new ChatServiceError('The assistant returned an error.', { kind: 'upstream' }));
      await sleep(0);
    });

    await waitFor(() =>
      expect(result.current.items[1]).toMatchObject({ status: 'error', error: 'interrupted', content: 'Hel' }),
    );
  });

  it('adds the focused project to the system message', async () => {
    stream.mockImplementation(async () => bufferedStream('ok'));
    const { result } = renderChat();

    act(() => result.current.focusProject('findit'));
    expect(result.current.focusSlug).toBe('findit');
    act(() => {
      result.current.send('What is it?');
    });

    const focused = requestAt(stream, 0).messages[0].content;
    expect(focused).toContain('## CURRENT CONTEXT');
    expect(focused).toContain('?project=findit');
    await waitFor(() => expect(result.current.busy).toBe(false));

    act(() => result.current.clearFocus());
    act(() => result.current.focusProject('nope'));
    expect(result.current.focusSlug).toBeNull();
    act(() => {
      result.current.send('And now?');
    });

    expect(requestAt(stream, 1).messages[0].content).not.toContain('## CURRENT CONTEXT');
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it('calls onSettled exactly once per answer (complete, stopped and error)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onSettled = vi.fn<(turn: AssistantTurn) => void>();
    const { result, rerender } = renderChat({ onSettled });

    stream.mockResolvedValueOnce(bufferedStream('Done'));
    act(() => {
      result.current.send('One');
    });
    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(1));
    expect(onSettled.mock.calls[0][0]).toMatchObject({ status: 'complete', content: 'Done' });

    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    act(() => {
      result.current.send('Two');
    });
    act(() => result.current.stop());
    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(onSettled.mock.calls[1][0]).toMatchObject({ status: 'stopped' });

    stream.mockRejectedValueOnce(new ChatServiceError('x', { status: 500 }));
    act(() => {
      result.current.send('Three');
    });
    await waitFor(() => expect(onSettled).toHaveBeenCalledTimes(3));
    expect(onSettled.mock.calls[2][0]).toMatchObject({ status: 'error', error: 'unavailable' });

    rerender({ onSettled });
    await act(async () => {
      await sleep(60);
    });
    expect(onSettled).toHaveBeenCalledTimes(3);
  });

  it('aborts the stream on unmount without dispatching afterwards', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const controlled = createControlledStream();
    stream.mockResolvedValueOnce(controlled.stream);
    const { result, unmount } = renderChat();

    act(() => {
      result.current.send('Hi');
    });
    await act(async () => {
      controlled.push('Hel');
      await sleep(0);
    });

    unmount();
    expect(optionsAt(stream, 0)?.signal?.aborted).toBe(true);

    controlled.push('lo');
    controlled.close();
    await sleep(60);

    expect(controlled.cancelled).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
