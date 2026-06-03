import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHAT_CONSUMERS } from '@/config/chatConfig';

import { streamChatCompletion } from './chatService';

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
      'https://magic.arz.ai/chat/openai/v1/completion',
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
