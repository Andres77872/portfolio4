import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { catalog, findProjectBySlug } from '@/components/Projects/catalog';
import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { streamChatCompletion } from '@/services/chatService';
import type { ChatRequestMessage } from '@/services/chatTypes';

import { toChatErrorKind } from '../chatErrors';
import { HISTORY_BUDGET, IDLE_TIMEOUT_MS, MAX_INPUT_CHARS } from '../constants';
import {
  conversationReducer,
  createId,
  historyForRetry,
  initialConversation,
  selectBusy,
  selectLastTurn,
  toRequestMessages,
  type AssistantTurn,
  type ChatItem,
  type UserTurn,
} from '../conversation';
import { createDeltaBatcher, type DeltaBatcher } from '../deltaBatcher';
import { getSystemMessage } from '../systemPrompt';

export interface UseChatOptions {
  stream?: typeof streamChatCompletion;
  getSystem?: typeof getSystemMessage;
  idleTimeoutMs?: number;
  /** Fires once when the last answer leaves pending/streaming (complete, stopped or error). */
  onSettled?: (turn: AssistantTurn) => void;
}

export type SendResult = { ok: true } | { ok: false; reason: 'empty' | 'too-long' | 'busy' };

export interface UseChatResult {
  items: readonly ChatItem[];
  focusSlug: string | null;
  busy: boolean;
  send(content: string): SendResult;
  stop(): void;
  retry(assistantId: string): void;
  reset(): void;
  focusProject(slug: string): void;
  clearFocus(): void;
}

interface ActiveTurn {
  assistantId: string;
  controller: AbortController;
  batcher: DeltaBatcher;
  reason: null | 'stop' | 'reset' | 'timeout' | 'unmount';
}

const noop = () => undefined;

const isSettled = (turn: AssistantTurn): boolean => turn.status !== 'pending' && turn.status !== 'streaming';

/**
 * Conversation state plus the streaming runner. State lives in a pure reducer that is
 * gated on each turn's status, so no ref is ever read inside a state updater: buffered
 * text is flushed and the final action dispatched before the active handle is cleared.
 */
export function useChat(options: UseChatOptions = {}): UseChatResult {
  const [state, dispatch] = useReducer(conversationReducer, initialConversation);

  // Read only in event handlers and the async runner, never during render or in updaters.
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  const activeRef = useRef<ActiveTurn | null>(null);
  const notifiedRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    stateRef.current = state;
    optionsRef.current = options;
  });

  const runTurn = useCallback(
    async (assistantId: string, history: ChatRequestMessage[], focusSlug: string | null) => {
      const {
        stream = streamChatCompletion,
        getSystem = getSystemMessage,
        idleTimeoutMs = IDLE_TIMEOUT_MS,
      } = optionsRef.current;

      const controller = new AbortController();
      const batcher = createDeltaBatcher((text) => dispatch({ type: 'delta', id: assistantId, text }));
      const active: ActiveTurn = { assistantId, controller, batcher, reason: null };
      activeRef.current = active;

      let idle: ReturnType<typeof setTimeout> | undefined;
      const armIdle = () => {
        clearTimeout(idle);
        idle = setTimeout(() => {
          if (active.reason !== null) return;
          active.reason = 'timeout';
          controller.abort();
        }, idleTimeoutMs);
      };

      let outcome: { ok: true } | { ok: false; error: unknown } = { ok: true };
      let received = false;

      try {
        armIdle();
        const body = await stream(
          { messages: [getSystem(focusSlug), ...history] },
          { consumer: CHAT_CONSUMERS.PORTFOLIO_ASSISTANT, signal: controller.signal },
        );
        const reader = body.getReader();
        // Releases a pending read as soon as the turn is stopped, reset or timed out,
        // even if the stream itself ignores the abort signal.
        const cancelReader = () => void reader.cancel().catch(noop);
        if (controller.signal.aborted) cancelReader();
        else controller.signal.addEventListener('abort', cancelReader, { once: true });

        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (active.reason) {
            cancelReader();
            break;
          }
          armIdle();
          const text = decoder.decode(value, { stream: true });
          if (text) {
            received = true;
            batcher.push(text);
          }
        }
        const tail = decoder.decode();
        if (tail) {
          received = true;
          batcher.push(tail);
        }
      } catch (error) {
        outcome = { ok: false, error };
      }

      clearTimeout(idle);

      // stop() already flushed; reset and unmount discard whatever is left.
      if (active.reason === null || active.reason === 'timeout') batcher.flush();
      else batcher.cancel();

      if (active.reason === 'timeout') {
        dispatch({ type: 'fail', id: assistantId, error: received ? 'interrupted' : 'timeout' });
      } else if (active.reason === null) {
        dispatch(
          outcome.ok
            ? { type: 'finish', id: assistantId }
            : {
                type: 'fail',
                id: assistantId,
                error: toChatErrorKind(outcome.error, { received, historyLength: history.length }),
              },
        );
      }

      // Cleared only after the final dispatch, so a new send can never overtake this turn.
      if (activeRef.current === active) activeRef.current = null;
    },
    [],
  );

  const send = useCallback(
    (content: string): SendResult => {
      const text = content.trim();
      if (!text) return { ok: false, reason: 'empty' };
      if (text.length > MAX_INPUT_CHARS) return { ok: false, reason: 'too-long' };

      const { items, focusSlug } = stateRef.current;
      if (activeRef.current || selectBusy(items)) return { ok: false, reason: 'busy' };

      const user: UserTurn = { id: createId('u'), role: 'user', content: text };
      const assistantId = createId('a');
      dispatch({ type: 'send', user, assistantId });
      void runTurn(assistantId, toRequestMessages([...items, user], HISTORY_BUDGET), focusSlug);
      return { ok: true };
    },
    [runTurn],
  );

  const stop = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    active.batcher.flush();
    active.reason = 'stop';
    dispatch({ type: 'stop', id: active.assistantId });
    // `stop` is this turn's final dispatch; the runner winds down without dispatching.
    activeRef.current = null;
    active.controller.abort();
  }, []);

  const reset = useCallback(() => {
    const active = activeRef.current;
    if (active) {
      active.reason = 'reset';
      active.batcher.cancel();
      activeRef.current = null;
      active.controller.abort();
    }
    dispatch({ type: 'reset' });
  }, []);

  const retry = useCallback(
    (assistantId: string) => {
      const { items, focusSlug } = stateRef.current;
      if (activeRef.current || selectBusy(items)) return;

      const last = items[items.length - 1];
      if (
        !last ||
        last.id !== assistantId ||
        last.role !== 'assistant' ||
        (last.status !== 'error' && last.status !== 'stopped')
      ) {
        return;
      }

      const nextId = createId('a');
      dispatch({ type: 'retry', id: assistantId, assistantId: nextId });
      void runTurn(nextId, toRequestMessages(historyForRetry(items, assistantId), HISTORY_BUDGET), focusSlug);
    },
    [runTurn],
  );

  const focusProject = useCallback((slug: string) => {
    if (findProjectBySlug(catalog, slug)) dispatch({ type: 'focus', projectSlug: slug });
  }, []);

  const clearFocus = useCallback(() => dispatch({ type: 'clearFocus' }), []);

  useEffect(
    () => () => {
      const active = activeRef.current;
      if (!active) return;
      active.reason = 'unmount';
      active.batcher.cancel();
      activeRef.current = null;
      active.controller.abort();
    },
    [],
  );

  useEffect(() => {
    const last = selectLastTurn(state.items);
    if (!last || !isSettled(last) || notifiedRef.current === last.id) return;
    notifiedRef.current = last.id;
    optionsRef.current.onSettled?.(last);
  }, [state.items]);

  const busy = selectBusy(state.items);

  return useMemo(
    () => ({
      items: state.items,
      focusSlug: state.focusSlug,
      busy,
      send,
      stop,
      retry,
      reset,
      focusProject,
      clearFocus,
    }),
    [state.items, state.focusSlug, busy, send, stop, retry, reset, focusProject, clearFocus],
  );
}

export default useChat;
