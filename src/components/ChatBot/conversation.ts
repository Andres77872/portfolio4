import type { ChatRequestMessage } from '@/services/chatTypes';

import { extractProjectSlugs } from './chatLinks';
import { HISTORY_BUDGET, MAX_CARDS_PER_TURN } from './constants';

export { createId, __resetIdsForTests } from './ids';

export type AssistantStatus = 'pending' | 'streaming' | 'complete' | 'stopped' | 'error';

export type ChatErrorKind =
  | 'offline'
  | 'unavailable'
  | 'rate-limited'
  | 'too-long'
  | 'timeout'
  | 'bad-response'
  | 'interrupted'
  | 'empty';

export interface UserTurn {
  id: string;
  role: 'user';
  content: string;
}

export interface AssistantTurn {
  id: string;
  role: 'assistant';
  content: string;
  status: AssistantStatus;
  error?: ChatErrorKind;
  /** Id of the user turn this answers; retry resends the history up to it. */
  replyTo: string;
}

export type ChatItem = UserTurn | AssistantTurn;

export interface ConversationState {
  items: readonly ChatItem[];
  focusSlug: string | null;
}

export type ConversationAction =
  | { type: 'send'; user: UserTurn; assistantId: string }
  | { type: 'delta'; id: string; text: string }
  | { type: 'finish'; id: string }
  | { type: 'stop'; id: string }
  | { type: 'fail'; id: string; error: ChatErrorKind }
  | { type: 'retry'; id: string; assistantId: string }
  | { type: 'focus'; projectSlug: string }
  | { type: 'clearFocus' }
  | { type: 'reset' };

export interface HistoryBudget {
  maxMessages: number;
  maxChars: number;
}

const NO_ITEMS: readonly ChatItem[] = [];

export const initialConversation: ConversationState = { items: NO_ITEMS, focusSlug: null };

const isInFlight = (status: AssistantStatus): boolean => status === 'pending' || status === 'streaming';

const lastItem = (items: readonly ChatItem[]): ChatItem | undefined => items[items.length - 1];

/** Applies `update` to the in-flight assistant turn `id`; any other target is a no-op (same reference). */
const updateInFlight = (
  state: ConversationState,
  id: string,
  update: (turn: AssistantTurn) => AssistantTurn,
): ConversationState => {
  const index = state.items.findIndex((item) => item.id === id);
  if (index === -1) return state;

  const item = state.items[index];
  if (item.role !== 'assistant' || !isInFlight(item.status)) return state;

  const next = update(item);
  if (next === item) return state;

  const items = state.items.slice();
  items[index] = next;
  return { ...state, items };
};

/** Pure. Returns the same reference on a no-op; untouched items keep their identity. */
export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'send': {
      const items = state.items.slice();
      const last = lastItem(items);
      // Defensive: a new send never leaves an older answer looking live.
      if (last?.role === 'assistant' && isInFlight(last.status)) {
        items[items.length - 1] = { ...last, status: 'stopped' };
      }
      items.push(action.user, {
        id: action.assistantId,
        role: 'assistant',
        content: '',
        status: 'pending',
        replyTo: action.user.id,
      });
      return { ...state, items };
    }

    case 'delta':
      if (!action.text) return state;
      return updateInFlight(state, action.id, (turn) => ({
        ...turn,
        content: turn.content + action.text,
        status: 'streaming',
      }));

    case 'finish':
      return updateInFlight(state, action.id, (turn) =>
        turn.content.trim() === ''
          ? { ...turn, status: 'error', error: 'empty' }
          : { ...turn, status: 'complete' },
      );

    case 'stop':
      return updateInFlight(state, action.id, (turn) => ({ ...turn, status: 'stopped' }));

    case 'fail':
      return updateInFlight(state, action.id, (turn) => ({ ...turn, status: 'error', error: action.error }));

    case 'retry': {
      const last = lastItem(state.items);
      if (
        !last ||
        last.id !== action.id ||
        last.role !== 'assistant' ||
        (last.status !== 'error' && last.status !== 'stopped')
      ) {
        return state;
      }
      const items = state.items.slice();
      items[items.length - 1] = {
        id: action.assistantId,
        role: 'assistant',
        content: '',
        status: 'pending',
        replyTo: last.replyTo,
      };
      return { ...state, items };
    }

    case 'focus':
      return state.focusSlug === action.projectSlug ? state : { ...state, focusSlug: action.projectSlug };

    case 'clearFocus':
      return state.focusSlug === null ? state : { ...state, focusSlug: null };

    case 'reset':
      return state.items.length === 0 && state.focusSlug === null ? state : initialConversation;

    default:
      return state;
  }
}

/** True while the last turn is an assistant answer that is still pending or streaming. */
export function selectBusy(items: readonly ChatItem[]): boolean {
  const last = lastItem(items);
  return last?.role === 'assistant' && isInFlight(last.status);
}

export function selectLastTurn(items: readonly ChatItem[]): AssistantTurn | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.role === 'assistant') return item;
  }
  return null;
}

/**
 * Keeps user turns + complete non-empty assistant turns; merges consecutive user turns with "\n\n"; windows from the end
 * to budget (the final user message is always kept); drops a leading assistant; result alternates and ends with a user turn.
 */
export function toRequestMessages(
  items: readonly ChatItem[],
  budget: HistoryBudget = HISTORY_BUDGET,
): ChatRequestMessage[] {
  const merged: ChatRequestMessage[] = [];

  for (const item of items) {
    if (item.role === 'assistant' && (item.status !== 'complete' || item.content.trim() === '')) continue;

    const previous = merged[merged.length - 1];
    if (previous?.role === item.role) {
      previous.content = `${previous.content}\n\n${item.content}`;
    } else {
      merged.push({ role: item.role, content: item.content });
    }
  }

  while (merged.length > 0 && merged[merged.length - 1].role !== 'user') merged.pop();
  if (merged.length === 0) return [];

  const final = merged[merged.length - 1];
  const windowed: ChatRequestMessage[] = [final];
  let chars = final.content.length;

  for (let index = merged.length - 2; index >= 0; index -= 1) {
    const message = merged[index];
    if (windowed.length >= budget.maxMessages || chars + message.content.length > budget.maxChars) break;
    windowed.unshift(message);
    chars += message.content.length;
  }

  while (windowed.length > 1 && windowed[0].role !== 'user') windowed.shift();
  return windowed;
}

/** Items up to and including the user turn that `assistantId` answers. */
export function historyForRetry(items: readonly ChatItem[], assistantId: string): readonly ChatItem[] {
  const index = items.findIndex((item) => item.id === assistantId);
  if (index === -1) return NO_ITEMS;

  const turn = items[index];
  const userIndex = turn.role === 'assistant' ? items.findIndex((item) => item.id === turn.replyTo) : -1;
  return userIndex === -1 ? items.slice(0, index) : items.slice(0, userIndex + 1);
}

/**
 * assistantId → project slugs to card under that answer. Only complete turns count, at most
 * `max` per turn, and a project is carded only on its first carded mention in the conversation.
 */
export function assignProjectCards(
  items: readonly ChatItem[],
  max: number = MAX_CARDS_PER_TURN,
): ReadonlyMap<string, readonly string[]> {
  const cards = new Map<string, readonly string[]>();
  const carded = new Set<string>();

  for (const item of items) {
    if (item.role !== 'assistant' || item.status !== 'complete') continue;

    const slugs: string[] = [];
    for (const slug of extractProjectSlugs(item.content)) {
      if (slugs.length >= max) break;
      if (carded.has(slug)) continue;
      carded.add(slug);
      slugs.push(slug);
    }
    if (slugs.length > 0) cards.set(item.id, slugs);
  }

  return cards;
}
