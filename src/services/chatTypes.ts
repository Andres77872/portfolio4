import type { ChatConsumer } from '@/config/chatConfig';

// Service-boundary types. The chat UI and the Matrix RPG terminal both build these.

export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatRequestMessage {
  role: ChatMessageRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatRequestMessage[];
}

export interface ChatServiceOptions {
  signal?: AbortSignal;
  consumer?: ChatConsumer;
}
