import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { readAll, sseResponse } from '@/test/streams';

import { ChatServiceError, parseSseLine, streamChatCompletion } from './chatService';

const encoder = new TextEncoder();

const mockFetch = vi.fn<typeof fetch>();

vi.stubGlobal('fetch', mockFetch);

function mockStreamResponse(content = 'Hello') {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${content}"}}]}\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n'));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

describe('streamChatCompletion', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CHAT_API_URL', '');
    vi.stubEnv('VITE_CHAT_API_KEY', '');
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', '');
    vi.stubEnv('VITE_CHAT_MATRIX_RPG_AGENT_ID', '');
    vi.stubEnv('VITE_COMPLETIONS_API_URL', '');
    vi.stubEnv('VITE_CHATBOT_AGENT_MODEL', '');
    vi.stubEnv('VITE_MATRIX_RPG_AGENT_MODEL', '');
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(mockStreamResponse());
  });

  it('sends the default endpoint, selected consumer model, messages, and stream flag', async () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');
    vi.stubEnv('VITE_CHAT_MATRIX_RPG_AGENT_ID', 'agt-matrix');

    await streamChatCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    }, {
      consumer: CHAT_CONSUMERS.MATRIX_RPG,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://llm.arz.ai/v1/completions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'agt-matrix',
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
        }),
      }),
    );
  });

  it('uses endpoint override and omits Authorization when no meaningful key exists', async () => {
    vi.stubEnv('VITE_CHAT_API_URL', 'https://example.test/completion');
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');

    await streamChatCompletion({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.test/completion',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('attaches Authorization only when an explicit key is configured', async () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');
    vi.stubEnv('VITE_CHAT_API_KEY', 'public-sentinel-token');

    await streamChatCompletion({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer public-sentinel-token',
        },
      }),
    );
  });

  it('fails before network request when required model config is missing', async () => {
    await expect(streamChatCompletion({ messages: [{ role: 'user', content: 'Hi' }] }))
      .rejects.toThrow(/Missing VITE_CHAT_PORTFOLIO_AGENT_ID/);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sanitizes upstream HTTP error details', async () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');
    mockFetch.mockResolvedValue(new Response('{"secret":"upstream"}', { status: 500, statusText: 'Nope' }));

    await expect(streamChatCompletion({ messages: [{ role: 'user', content: 'Hi' }] }))
      .rejects.toThrow('Chat service request failed with status 500. Please try again later.');
  });

  it('returns a decoded stream for successful SSE chunks', async () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');

    const stream = await streamChatCompletion({ messages: [{ role: 'user', content: 'Hi' }] });
    const reader = stream.getReader();
    const firstChunk = await reader.read();

    expect(new TextDecoder().decode(firstChunk.value)).toBe('Hello');
  });
});

const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;
const request = { messages: [{ role: 'user' as const, content: 'Hi' }] };

describe('parseSseLine', () => {
  it.each([
    ['data: {"choices":[{"delta":{"content":"a"}}]}', undefined, { type: 'content', text: 'a' }],
    ['data:{"choices":[{"delta":{"content":"a"}}]}', undefined, { type: 'content', text: 'a' }],
    ['data: [DONE]', undefined, { type: 'done' }],
    [': keepalive', undefined, { type: 'skip' }],
    ['', undefined, { type: 'skip' }],
    ['event: ping', undefined, { type: 'event', name: 'ping' }],
    ['id: 7', undefined, { type: 'skip' }],
    ['retry: 1000', undefined, { type: 'skip' }],
    ['data: not-json', undefined, { type: 'invalid' }],
    ['data: {"error":{"message":"x"}}', undefined, { type: 'error', message: 'x' }],
    ['data: {"message":"overloaded"}', 'error', { type: 'error', message: 'overloaded' }],
    ['data: {"choices":[{"delta":{"content":"a"}}]}\r', undefined, { type: 'content', text: 'a' }],
    ['data: {"choices":[{"delta":{"content":""}}]}', undefined, { type: 'skip' }],
    ['data: {"choices":[{"delta":{"content":42}}]}', undefined, { type: 'skip' }],
    ['data: {"choices":[{"delta":{}}]}', undefined, { type: 'skip' }],
    ['<!doctype html>', undefined, { type: 'invalid' }],
  ] as const)('classifies %j (event %s)', (line, event, expected) => {
    expect(parseSseLine(line, event)).toEqual(expected);
  });
});

describe('streamChatCompletion stream handling', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CHAT_API_URL', 'https://example.test/completion');
    vi.stubEnv('VITE_CHAT_API_KEY', '');
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-portfolio');
    vi.stubEnv('VITE_CHAT_MATRIX_RPG_AGENT_ID', '');
    vi.stubEnv('VITE_COMPLETIONS_API_URL', '');
    vi.stubEnv('VITE_CHATBOT_AGENT_MODEL', '');
    vi.stubEnv('VITE_MATRIX_RPG_AGENT_MODEL', '');
    mockFetch.mockReset();
  });

  it('emits several events from one network chunk in order', async () => {
    mockFetch.mockResolvedValue(sseResponse([delta('a'), delta('b'), delta('c'), 'data: [DONE]']));

    const stream = await streamChatCompletion(request);
    const reader = stream.getReader();
    const chunks: string[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    expect(chunks).toEqual(['a', 'b', 'c']);
  });

  it('joins a line split across two chunks into one item', async () => {
    const line = delta('Hello');
    mockFetch.mockResolvedValue(sseResponse([line], { split: [Math.floor(line.length / 2)] }));

    const stream = await streamChatCompletion(request);
    const reader = stream.getReader();
    const first = await reader.read();

    expect(new TextDecoder().decode(first.value)).toBe('Hello');
    expect((await reader.read()).done).toBe(true);
  });

  it('emits a final line that has no trailing newline', async () => {
    mockFetch.mockResolvedValue(sseResponse([delta('a'), delta('b')], { trailingNewline: false }));

    await expect(readAll(await streamChatCompletion(request))).resolves.toBe('ab');
  });

  it('decodes a multi-byte character split across chunks intact', async () => {
    const line = delta('olé ✓');
    const bytes = new TextEncoder().encode(line);
    const checkmark = new TextEncoder().encode('✓');
    const start = bytes.findIndex((byte, index) => byte === checkmark[0] && bytes[index + 1] === checkmark[1]);
    mockFetch.mockResolvedValue(sseResponse([line], { split: [start + 1, start + 2] }));

    await expect(readAll(await streamChatCompletion(request))).resolves.toBe('olé ✓');
  });

  it('skips a garbage line between valid lines', async () => {
    mockFetch.mockResolvedValue(sseResponse([delta('Hel'), 'data: {oops', ': keepalive', delta('lo'), 'data: [DONE]']));

    await expect(readAll(await streamChatCompletion(request))).resolves.toBe('Hello');
  });

  it('rejects an all-garbage body with a parse error', async () => {
    mockFetch.mockResolvedValue(sseResponse(['<!doctype html>', '<p>Bad gateway</p>']));

    const error = await readAll(await streamChatCompletion(request)).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatServiceError);
    expect(error).toMatchObject({ kind: 'parse' });
  });

  it('rejects an in-band error payload and cancels the upstream body', async () => {
    const onCancel = vi.fn();
    mockFetch.mockResolvedValue(
      sseResponse([delta('Hel'), 'data: {"error":{"message":"upstream exploded"}}', delta('lo')], {
        keepOpen: true,
        onCancel,
      }),
    );

    const error = await readAll(await streamChatCompletion(request)).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatServiceError);
    expect(error).toMatchObject({ kind: 'upstream', message: 'The assistant returned an error.' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('delivers text that precedes an in-band error in the same network chunk before rejecting', async () => {
    mockFetch.mockResolvedValue(
      sseResponse([delta('Hel'), delta('lo'), 'data: {"error":{"message":"upstream exploded"}}', delta('never')]),
    );

    const reader = (await streamChatCompletion(request)).getReader();
    const decoder = new TextDecoder();
    const seen: string[] = [];
    let failure: unknown;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        seen.push(decoder.decode(value));
      }
    } catch (error) {
      failure = error;
    }

    expect(seen).toEqual(['Hel', 'lo']);
    expect(failure).toBeInstanceOf(ChatServiceError);
    expect(failure).toMatchObject({ kind: 'upstream' });
  });

  it('closes on [DONE] even when the upstream body stays open, and cancels it', async () => {
    const onCancel = vi.fn();
    mockFetch.mockResolvedValue(sseResponse([delta('Hello'), 'data: [DONE]'], { keepOpen: true, onCancel }));

    await expect(readAll(await streamChatCompletion(request))).resolves.toBe('Hello');
    expect(onCancel).toHaveBeenCalled();
  });

  it('adds kind and status to HTTP errors without changing the message', async () => {
    mockFetch.mockResolvedValue(new Response('slow down', { status: 429 }));

    const error = await streamChatCompletion(request).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatServiceError);
    expect(error).toMatchObject({
      message: 'Chat service request failed with status 429. Please try again later.',
      status: 429,
      kind: 'http',
    });
  });

  it('defaults ChatServiceError to an http error named ChatServiceError', () => {
    const error = new ChatServiceError('x');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChatServiceError');
    expect(error.kind).toBe('http');
    expect(error.status).toBeUndefined();
  });

  it('keeps the no-body message and marks it no-body', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(streamChatCompletion(request)).rejects.toMatchObject({
      message: 'API request succeeded but no response body was available for streaming.',
      kind: 'no-body',
    });
  });

  it('wraps missing configuration as a config error with the same message and never fetches', async () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', '');

    const error = await streamChatCompletion(request).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatServiceError);
    expect((error as ChatServiceError).message).toMatch(/Missing VITE_CHAT_PORTFOLIO_AGENT_ID/);
    expect((error as ChatServiceError).kind).toBe('config');
    expect((error as ChatServiceError).cause).toBeInstanceOf(Error);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes network failures through unwrapped', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await streamChatCompletion(request).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(ChatServiceError);
  });

  it('errors the stream with an unwrapped AbortError when the signal aborts mid-read', async () => {
    mockFetch.mockImplementation(async (_input, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`${delta('Hel')}\n`));
          init?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('The operation was aborted.', 'AbortError'));
          });
        },
      });
      return new Response(body, { status: 200 });
    });
    const controller = new AbortController();

    const stream = await streamChatCompletion(request, { signal: controller.signal });
    const reader = stream.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('Hel');

    const pending = reader.read();
    controller.abort();
    const error = await pending.catch((reason: unknown) => reason);

    expect(error).toMatchObject({ name: 'AbortError' });
    expect(error).not.toBeInstanceOf(ChatServiceError);
  });

  it('resolves a ReadableStream of Uint8Array chunks that decode to the full text (Matrix RPG contract)', async () => {
    mockFetch.mockResolvedValue(sseResponse([delta('Wake up, '), delta('Neo… '), delta('✓'), 'data: [DONE]']));

    const stream = await streamChatCompletion(request, { consumer: CHAT_CONSUMERS.MATRIX_RPG });
    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // jsdom and Node have different Uint8Array realms, so check the tag instead of instanceof.
      expect(Object.prototype.toString.call(value)).toBe('[object Uint8Array]');
      text += decoder.decode(value, { stream: true });
    }

    expect(text + decoder.decode()).toBe('Wake up, Neo… ✓');
  });
});
