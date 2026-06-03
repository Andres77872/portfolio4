/**
 * OpenAI API integration for chat completions with streaming support
 */

import type { ChatRequest, ChatServiceOptions } from '../components/ChatBot/types';
import { CHAT_CONSUMERS, getChatServiceConfig } from '@/config/chatConfig';

export class ChatServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

/**
 * Sends a request to the OpenAI-compatible API and returns a streaming response
 * @param request The chat request containing messages
 * @param options Optional service controls such as request cancellation
 * @returns A ReadableStream that emits chunks of the response
 */
export async function streamChatCompletion(
  request: ChatRequest,
  options?: ChatServiceOptions
): Promise<ReadableStream<Uint8Array>> {
  const config = getChatServiceConfig();
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

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: options?.signal
  });

  // Check if the request was successful
  if (!response.ok) {
    throw new ChatServiceError(
      `Chat service request failed with status ${response.status}. Please try again later.`
    );
  }

  // Check if the response body is available. Do not silently fake success.
  if (!response.body) {
    throw new ChatServiceError('API request succeeded but no response body was available for streaming.');
  }

  // Process the stream from the response.
  // OpenAI-compatible APIs return data in SSE format with a 'data: ' prefix.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let pendingLine = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = (pendingLine + chunk).split('\n');
          pendingLine = lines.pop() ?? '';

          for (const line of lines) {
            processSseLine(line, controller, encoder);
          }
        }

        const finalChunk = decoder.decode();
        const finalLines = (pendingLine + finalChunk).split('\n');

        for (const line of finalLines) {
          processSseLine(line, controller, encoder);
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },

    cancel() {
      void reader.cancel().catch(() => undefined);
    }
  });
}

function processSseLine(
  line: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): void {
  const trimmedLine = line.trim();

  if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
    return;
  }

  const jsonData = trimmedLine.slice(6).trim();

  if (!jsonData || jsonData === '[DONE]') {
    return;
  }

  try {
    const data = JSON.parse(jsonData);
    const content = data?.choices?.[0]?.delta?.content;

    if (typeof content === 'string' && content.length > 0) {
      controller.enqueue(encoder.encode(content));
    }
  } catch (error) {
    throw new ChatServiceError(`Failed to parse streaming chat response: ${String(error)}`);
  }
}
