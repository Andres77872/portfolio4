import type { ChatServiceError } from '@/services/chatService';

import { TOO_LONG_MIN_HISTORY } from './constants';
import type { ChatErrorKind } from './conversation';

export type ChatErrorAction = 'retry' | 'email' | 'browse' | 'new-chat';

export interface ChatErrorCopy {
  title: string;
  detail: string;
  actions: readonly ChatErrorAction[];
}

export const ERROR_COPY: Record<ChatErrorKind, ChatErrorCopy> = {
  offline: {
    title: "You're offline.",
    detail: 'Reconnect, then try again.',
    actions: ['retry', 'browse'],
  },
  unavailable: {
    title: 'The assistant is unavailable right now.',
    detail: 'Try again in a moment, or reach Andres directly.',
    actions: ['retry', 'email', 'browse'],
  },
  'rate-limited': {
    title: 'Too many requests.',
    detail: 'Wait a minute, then try again.',
    actions: ['retry', 'email'],
  },
  'too-long': {
    title: 'This conversation is too long for the assistant.',
    detail: 'Start a new chat to continue.',
    actions: ['new-chat'],
  },
  timeout: {
    title: 'The assistant stopped responding.',
    detail: 'No reply for 45 seconds. Try again.',
    actions: ['retry', 'email'],
  },
  'bad-response': {
    title: "The assistant sent a response it couldn't read.",
    detail: 'Try again.',
    actions: ['retry'],
  },
  interrupted: {
    title: 'The answer was cut off.',
    detail: 'The part above is incomplete.',
    actions: ['retry'],
  },
  empty: {
    title: 'The assistant returned an empty answer.',
    detail: 'Try again or rephrase the question.',
    actions: ['retry'],
  },
};

type ServiceErrorFields = Pick<ChatServiceError, 'kind' | 'status'>;

// Duck-typed on `name` so classification survives module mocks and duplicate module instances.
const asServiceError = (error: unknown): ServiceErrorFields | null =>
  error instanceof Error && error.name === 'ChatServiceError' ? (error as unknown as ServiceErrorFields) : null;

/**
 * Maps a failed request to a user-facing error kind; the first matching rule wins.
 * Idle timeouts are classified by the runner, and blank answers by the reducer.
 */
export function toChatErrorKind(
  error: unknown,
  { received, historyLength }: { received: boolean; historyLength: number },
): ChatErrorKind {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';

  const serviceError = asServiceError(error);

  if (serviceError?.kind === 'config') {
    // A misconfigured deploy must be visible in production logs too.
    console.error(error);
    return 'unavailable';
  }

  if (import.meta.env.DEV) console.error('[portfolio-assistant]', error);

  const status = serviceError?.status;
  if (status === 429) return 'rate-limited';
  if (status === 413 || (status === 400 && historyLength >= TOO_LONG_MIN_HISTORY)) return 'too-long';
  if (serviceError?.kind === 'parse') return received ? 'interrupted' : 'bad-response';
  return received ? 'interrupted' : 'unavailable';
}
