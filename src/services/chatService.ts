/**
 * OpenAI-compatible chat completions with streaming support.
 */

import { CHAT_CONSUMERS, getChatServiceConfig, type ChatServiceConfig } from '@/config/chatConfig';
import type { ChatRequest, ChatServiceOptions } from './chatTypes';

export type ChatServiceErrorKind = 'http' | 'config' | 'no-body' | 'parse' | 'upstream';

export interface ChatServiceErrorOptions {
  kind?: ChatServiceErrorKind;
  status?: number;
  cause?: unknown;
}

export class ChatServiceError extends Error {
  readonly kind: ChatServiceErrorKind;
  readonly status?: number;
  // Assigned by hand: the ES2020 lib has no `Error` constructor options.
  readonly cause?: unknown;

  constructor(message: string, options: ChatServiceErrorOptions = {}) {
    super(message);
    this.name = 'ChatServiceError';
    this.kind = options.kind ?? 'http';
    this.status = options.status;
    this.cause = options.cause;
  }
}

export type SseLine =
  | { type: 'content'; text: string }
  | { type: 'done' }
  | { type: 'event'; name: string }
  | { type: 'error'; message: string }
  | { type: 'skip' }
  | { type: 'invalid' };

const SKIP: SseLine = { type: 'skip' };
const INVALID: SseLine = { type: 'invalid' };

const readErrorMessage = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object' && 'message' in value) {
    const { message } = value as { message?: unknown };
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Upstream error';
};

/**
 * Classifies one SSE line. `event` is the current `event:` field, which the caller
 * tracks and resets on a blank line.
 */
export function parseSseLine(line: string, event?: string): SseLine {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) return SKIP;

  const colon = trimmed.indexOf(':');
  const field = colon === -1 ? trimmed : trimmed.slice(0, colon);
  const value = colon === -1 ? '' : trimmed.slice(colon + 1).trim();

  switch (field) {
    case 'event':
      return { type: 'event', name: value };
    case 'id':
    case 'retry':
      return SKIP;
    case 'data':
      break;
    default:
      // Not an SSE field: an HTML error page or other garbage served as the stream.
      return INVALID;
  }

  if (!value) return SKIP;
  if (value === '[DONE]') return { type: 'done' };

  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return event === 'error' ? { type: 'error', message: value } : INVALID;
  }

  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;

  if (event === 'error' || record?.error) {
    return { type: 'error', message: readErrorMessage(record?.error ?? record) };
  }

  const choices = record?.choices;
  const first = Array.isArray(choices) ? (choices[0] as { delta?: { content?: unknown } } | undefined) : undefined;
  const content = first?.delta?.content;

  return typeof content === 'string' && content.length > 0 ? { type: 'content', text: content } : SKIP;
}

const noop = () => undefined;

/**
 * Sends a request to the OpenAI-compatible API and returns a streaming response.
 * @param request The chat request containing messages
 * @param options Optional service controls such as request cancellation
 * @returns A ReadableStream that emits UTF-8 encoded content chunks
 */
export async function streamChatCompletion(
  request: ChatRequest,
  options?: ChatServiceOptions
): Promise<ReadableStream<Uint8Array>> {
  let config: ChatServiceConfig;
  try {
    config = getChatServiceConfig();
  } catch (error) {
    throw new ChatServiceError(error instanceof Error ? error.message : String(error), {
      kind: 'config',
      cause: error,
    });
  }

  const consumer = options?.consumer ?? CHAT_CONSUMERS.PORTFOLIO_ASSISTANT;
  const model = config.consumers[consumer].model;

  // Prepare the request payload. Only send the API message shape so future UI
  // metadata (ids/status/retry fields) never leaks into the service boundary.
  const payload = {
    model,
    messages: request.messages.map(({ role, content }) => ({ role, content })),
    stream: true
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  // Network failures and AbortError propagate unwrapped: callers check `error.name`.
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: options?.signal
  });

  if (!response.ok) {
    throw new ChatServiceError(
      `Chat service request failed with status ${response.status}. Please try again later.`,
      { kind: 'http', status: response.status }
    );
  }

  // Check if the response body is available. Do not silently fake success.
  if (!response.body) {
    throw new ChatServiceError('API request succeeded but no response body was available for streaming.', {
      kind: 'no-body',
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // Content is decoded to parse SSE, then re-encoded: consumers (Matrix RPG included)
  // rely on the ReadableStream<Uint8Array> contract.
  const encoder = new TextEncoder();

  let pendingLine = '';
  let event: string | undefined;
  let emitted = 0;
  let invalid = 0;
  let cancelled = false;
  // Erroring a ReadableStream discards chunks still in its queue, so an error that follows
  // text in the same network chunk is raised on the next pull, once that text has been read.
  let deferredError: { error: unknown } | null = null;

  /** Returns true once the stream is finished (`[DONE]`). */
  const handleLine = (controller: ReadableStreamDefaultController<Uint8Array>, line: string): boolean => {
    const parsed = parseSseLine(line, event);

    switch (parsed.type) {
      case 'content':
        controller.enqueue(encoder.encode(parsed.text));
        emitted += 1;
        return false;
      case 'done':
        return true;
      case 'event':
        event = parsed.name;
        return false;
      case 'error':
        throw new ChatServiceError('The assistant returned an error.', {
          kind: 'upstream',
          cause: parsed.message,
        });
      case 'invalid':
        invalid += 1;
        return false;
      case 'skip':
        if (!line.trim()) event = undefined;
        return false;
    }
  };

  /** Returns true once the stream is finished (`[DONE]`). */
  const handleText = (controller: ReadableStreamDefaultController<Uint8Array>, text: string): boolean => {
    const lines = text.split('\n');
    pendingLine = lines.pop() ?? '';
    for (const line of lines) {
      if (handleLine(controller, line)) return true;
    }
    return false;
  };

  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    void reader.cancel().catch(noop);
    controller.close();
  };

  return new ReadableStream<Uint8Array>({
    // Pull-based: each pull reads upstream until it has enqueued text or the stream ends.
    async pull(controller) {
      if (deferredError) {
        controller.error(deferredError.error);
        return;
      }

      const before = emitted;
      try {
        while (emitted === before) {
          const { done, value } = await reader.read();
          if (cancelled) return;

          if (done) {
            if (handleText(controller, pendingLine + decoder.decode()) || handleLine(controller, pendingLine)) {
              finish(controller);
              return;
            }
            if (emitted === 0 && invalid > 0) {
              throw new ChatServiceError('The assistant sent a response that could not be read.', { kind: 'parse' });
            }
            controller.close();
            return;
          }

          if (handleText(controller, pendingLine + decoder.decode(value, { stream: true }))) {
            finish(controller);
            return;
          }
        }
      } catch (error) {
        void reader.cancel().catch(noop);
        if (cancelled) return;
        if (emitted > before) deferredError = { error };
        else controller.error(error);
      }
    },

    cancel() {
      cancelled = true;
      void reader.cancel().catch(noop);
    }
  });
}
