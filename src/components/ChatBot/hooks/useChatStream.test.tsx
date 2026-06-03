import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { streamChatCompletion } from '@/services/chatService';

import { useChatStream } from './useChatStream';
import type { Message } from '../types';

vi.mock('@/services/chatService', () => ({
  streamChatCompletion: vi.fn(),
}));

const mockedStreamChatCompletion = vi.mocked(streamChatCompletion);
const encoder = new TextEncoder();

const systemContext: Message = {
  id: 'system',
  role: 'system',
  content: 'System prompt',
  timestamp: new Date('2024-01-01T00:00:00.000Z'),
  status: 'complete',
};

function createTextStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encodedChunks = chunks.map((chunk) => encoder.encode(chunk));

  return {
    getReader: () => ({
      read: vi.fn(async () => {
        const value = encodedChunks.shift();
        return value ? { done: false, value } : { done: true, value: undefined };
      }),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
      closed: Promise.resolve(undefined),
    }),
    locked: false,
    cancel: vi.fn(async () => undefined),
    pipeThrough: vi.fn(),
    pipeTo: vi.fn(),
    tee: vi.fn(),
  } as unknown as ReadableStream<Uint8Array>;
}

describe('useChatStream', () => {
  beforeEach(() => {
    mockedStreamChatCompletion.mockReset();
  });

  it('passes the portfolio assistant consumer and starts a streaming assistant response', async () => {
    mockedStreamChatCompletion.mockResolvedValue(createTextStream('Hel', 'lo'));
    const { result } = renderHook(() => useChatStream({ systemContext }));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(mockedStreamChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hi' }),
        ]),
      }),
      expect.objectContaining({ consumer: CHAT_CONSUMERS.PORTFOLIO_ASSISTANT }),
    );
    expect(result.current.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'assistant', status: 'streaming' }),
      ]),
    );
  });

  it('exposes a recoverable error state when streaming fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedStreamChatCompletion.mockRejectedValue(new Error('service unavailable'));
    const { result } = renderHook(() => useChatStream({ systemContext }));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'assistant',
            status: 'error',
            errorMessage: 'service unavailable',
          }),
        ]),
      );
    });
    expect(result.current.isStreaming).toBe(false);

    consoleError.mockRestore();
  });
});
