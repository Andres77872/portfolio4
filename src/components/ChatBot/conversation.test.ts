import { describe, expect, it } from 'vitest';

import {
  __resetIdsForTests,
  assignProjectCards,
  conversationReducer,
  createId,
  historyForRetry,
  initialConversation,
  selectBusy,
  selectLastTurn,
  toRequestMessages,
  type AssistantStatus,
  type AssistantTurn,
  type ChatItem,
  type ConversationState,
  type UserTurn,
} from './conversation';

const user = (id: string, content = id): UserTurn => ({ id, role: 'user', content });

const assistant = (
  id: string,
  replyTo: string,
  status: AssistantStatus = 'complete',
  content = status === 'complete' ? `answer ${id}` : '',
): AssistantTurn => ({ id, role: 'assistant', content, status, replyTo });

const withItems = (...items: ChatItem[]): ConversationState => ({ items, focusSlug: null });

const sent = (text = 'Hi'): ConversationState =>
  conversationReducer(initialConversation, { type: 'send', user: user('u1', text), assistantId: 'a1' });

describe('conversationReducer', () => {
  it('send appends the user turn and a pending assistant that replies to it', () => {
    const state = sent();

    expect(state.items).toEqual([
      { id: 'u1', role: 'user', content: 'Hi' },
      { id: 'a1', role: 'assistant', content: '', status: 'pending', replyTo: 'u1' },
    ]);
  });

  it('send stops a trailing streaming turn before appending', () => {
    const streaming = conversationReducer(sent(), { type: 'delta', id: 'a1', text: 'Hel' });
    const next = conversationReducer(streaming, { type: 'send', user: user('u2'), assistantId: 'a2' });

    expect(next.items[1]).toMatchObject({ id: 'a1', status: 'stopped', content: 'Hel' });
    expect(next.items[3]).toMatchObject({ id: 'a2', status: 'pending', replyTo: 'u2' });
  });

  it('delta appends text and moves the turn to streaming, keeping untouched items', () => {
    const start = sent();
    const next = conversationReducer(start, { type: 'delta', id: 'a1', text: 'Hel' });
    const after = conversationReducer(next, { type: 'delta', id: 'a1', text: 'lo' });

    expect(after.items[1]).toMatchObject({ content: 'Hello', status: 'streaming' });
    expect(after.items[0]).toBe(start.items[0]);
  });

  it.each([
    ['stop', { type: 'stop', id: 'a1' }],
    ['fail', { type: 'fail', id: 'a1', error: 'unavailable' }],
    ['finish', { type: 'finish', id: 'a1' }],
  ] as const)('ignores a delta after %s (same reference)', (_name, action) => {
    const settled = conversationReducer(conversationReducer(sent(), { type: 'delta', id: 'a1', text: 'x' }), action);

    expect(conversationReducer(settled, { type: 'delta', id: 'a1', text: 'late' })).toBe(settled);
  });

  it('ignores a delta after reset, for an unknown id, or for a user turn', () => {
    const reset = conversationReducer(sent(), { type: 'reset' });
    const live = sent();

    expect(conversationReducer(reset, { type: 'delta', id: 'a1', text: 'late' })).toBe(reset);
    expect(conversationReducer(live, { type: 'delta', id: 'nope', text: 'x' })).toBe(live);
    expect(conversationReducer(live, { type: 'delta', id: 'u1', text: 'x' })).toBe(live);
    expect(conversationReducer(live, { type: 'delta', id: 'a1', text: '' })).toBe(live);
  });

  it('finish on blank content is an empty error; with content it completes', () => {
    const blank = conversationReducer(
      conversationReducer(sent(), { type: 'delta', id: 'a1', text: '  \n ' }),
      { type: 'finish', id: 'a1' },
    );
    const empty = conversationReducer(sent(), { type: 'finish', id: 'a1' });
    const full = conversationReducer(
      conversationReducer(sent(), { type: 'delta', id: 'a1', text: 'Hello' }),
      { type: 'finish', id: 'a1' },
    );

    expect(blank.items[1]).toMatchObject({ status: 'error', error: 'empty' });
    expect(empty.items[1]).toMatchObject({ status: 'error', error: 'empty' });
    expect(full.items[1]).toMatchObject({ status: 'complete', content: 'Hello' });
    expect(full.items[1]).not.toHaveProperty('error');
  });

  it('fail keeps partial content', () => {
    const failed = conversationReducer(
      conversationReducer(sent(), { type: 'delta', id: 'a1', text: 'Part' }),
      { type: 'fail', id: 'a1', error: 'interrupted' },
    );

    expect(failed.items[1]).toMatchObject({ status: 'error', error: 'interrupted', content: 'Part' });
  });

  it('stop only applies to in-flight turns', () => {
    const complete = conversationReducer(
      conversationReducer(sent(), { type: 'delta', id: 'a1', text: 'Done' }),
      { type: 'finish', id: 'a1' },
    );

    expect(conversationReducer(complete, { type: 'stop', id: 'a1' })).toBe(complete);
    expect(conversationReducer(sent(), { type: 'stop', id: 'a1' }).items[1]).toMatchObject({ status: 'stopped' });
  });

  it('retry is a no-op unless the target is the last, settled-with-failure turn', () => {
    const olderFailed = withItems(
      user('u1'),
      assistant('a1', 'u1', 'error'),
      user('u2'),
      assistant('a2', 'u2', 'complete'),
    );
    const lastComplete = withItems(user('u1'), assistant('a1', 'u1', 'complete'));
    const lastStreaming = withItems(user('u1'), assistant('a1', 'u1', 'streaming', 'x'));

    expect(conversationReducer(olderFailed, { type: 'retry', id: 'a1', assistantId: 'a9' })).toBe(olderFailed);
    expect(conversationReducer(lastComplete, { type: 'retry', id: 'a1', assistantId: 'a9' })).toBe(lastComplete);
    expect(conversationReducer(lastStreaming, { type: 'retry', id: 'a1', assistantId: 'a9' })).toBe(lastStreaming);
    expect(conversationReducer(lastComplete, { type: 'retry', id: 'u1', assistantId: 'a9' })).toBe(lastComplete);
  });

  it.each(['error', 'stopped'] as const)('retry replaces a last %s turn in place with a new pending turn', (status) => {
    const state = withItems(user('u1'), assistant('a1', 'u1', 'complete'), user('u2'), assistant('a2', 'u2', status, 'part'));
    const next = conversationReducer(state, { type: 'retry', id: 'a2', assistantId: 'a3' });

    expect(next.items).toHaveLength(4);
    expect(next.items[3]).toEqual({ id: 'a3', role: 'assistant', content: '', status: 'pending', replyTo: 'u2' });
    expect(next.items[0]).toBe(state.items[0]);
  });

  it('focus, clearFocus and reset', () => {
    const focused = conversationReducer(sent(), { type: 'focus', projectSlug: 'findit' });
    expect(focused.focusSlug).toBe('findit');
    expect(conversationReducer(focused, { type: 'focus', projectSlug: 'findit' })).toBe(focused);

    const cleared = conversationReducer(focused, { type: 'clearFocus' });
    expect(cleared.focusSlug).toBeNull();
    expect(conversationReducer(cleared, { type: 'clearFocus' })).toBe(cleared);

    const reset = conversationReducer(focused, { type: 'reset' });
    expect(reset).toEqual({ items: [], focusSlug: null });
    expect(conversationReducer(reset, { type: 'reset' })).toBe(reset);
  });
});

describe('toRequestMessages', () => {
  it('drops error, stopped, pending and empty assistant turns', () => {
    const items: ChatItem[] = [
      user('u1', 'A'),
      assistant('a1', 'u1', 'complete', 'ok'),
      user('u2', 'B'),
      assistant('a2', 'u2', 'error', 'partial'),
      user('u3', 'C'),
      assistant('a3', 'u3', 'stopped', 'half'),
      user('u4', 'D'),
      assistant('a4', 'u4', 'complete', '   '),
      user('u5', 'E'),
      assistant('a5', 'u5', 'pending'),
    ];

    expect(toRequestMessages(items)).toEqual([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'B\n\nC\n\nD\n\nE' },
    ]);
  });

  it('merges an unanswered user turn into the next one', () => {
    const items = [user('u1', 'A'), assistant('a1', 'u1', 'error'), user('u2', 'B')];

    expect(toRequestMessages(items)).toEqual([{ role: 'user', content: 'A\n\nB' }]);
  });

  it('windows long histories to the budget, starting with a user and ending with a user', () => {
    const items: ChatItem[] = [];
    for (let turn = 0; turn < 20; turn += 1) {
      items.push(user(`u${turn}`, `question ${turn} ${'q'.repeat(300)}`));
      items.push(assistant(`a${turn}`, `u${turn}`, 'complete', `answer ${turn} ${'a'.repeat(900)}`));
    }
    items.push(user('last', 'final question'));

    const messages = toRequestMessages(items, { maxMessages: 12, maxChars: 12_000 });
    const chars = messages.reduce((total, message) => total + message.content.length, 0);

    expect(messages.length).toBeLessThanOrEqual(12);
    expect(chars).toBeLessThanOrEqual(12_000);
    expect(messages[0].role).toBe('user');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'final question' });
    messages.forEach((message, index) => {
      if (index > 0) expect(message.role).not.toBe(messages[index - 1].role);
    });
  });

  it('respects the message cap when messages are short', () => {
    const items: ChatItem[] = [];
    for (let turn = 0; turn < 20; turn += 1) {
      items.push(user(`u${turn}`), assistant(`a${turn}`, `u${turn}`));
    }
    items.push(user('last'));

    const messages = toRequestMessages(items);

    expect(messages.length).toBeLessThanOrEqual(12);
    expect(messages[0].role).toBe('user');
    expect(messages[messages.length - 1].content).toBe('last');
  });

  it('always includes an oversized final user message', () => {
    const huge = 'x'.repeat(20_000);
    const items = [user('u1', 'A'), assistant('a1', 'u1'), user('u2', huge)];

    expect(toRequestMessages(items)).toEqual([{ role: 'user', content: huge }]);
  });

  it('never ends on an assistant turn', () => {
    const items = [user('u1', 'A'), assistant('a1', 'u1', 'complete', 'ok')];

    expect(toRequestMessages(items)).toEqual([{ role: 'user', content: 'A' }]);
    expect(toRequestMessages([])).toEqual([]);
  });
});

describe('historyForRetry', () => {
  it('stops at the reply-to user turn of the target', () => {
    const items = [user('u1'), assistant('a1', 'u1'), user('u2'), assistant('a2', 'u2', 'error')];

    expect(historyForRetry(items, 'a2')).toEqual([user('u1'), assistant('a1', 'u1'), user('u2')]);
    expect(historyForRetry(items, 'nope')).toEqual([]);
  });
});

describe('assignProjectCards', () => {
  it('cards only complete turns, at most two per turn, each project once per conversation', () => {
    const items: ChatItem[] = [
      user('u1'),
      assistant('a1', 'u1', 'complete', 'See [FindIT](?project=findit) and [Nope](?project=nope).'),
      user('u2'),
      assistant(
        'a2',
        'u2',
        'complete',
        '[Yellow Rooms](?project=yellow-rooms), [Novus Talk](?project=novus-talk), [magic-llm](?project=magic-llm)',
      ),
      user('u3'),
      assistant('a3', 'u3', 'complete', 'Again [FindIT](?project=findit) and [magic-llm](?project=magic-llm).'),
      user('u4'),
      assistant('a4', 'u4', 'stopped', '[Magic Auth](?project=magic-auth)'),
      user('u5'),
      assistant('a5', 'u5', 'streaming', '[Portfolio](?project=portfolio)'),
    ];

    const cards = assignProjectCards(items);

    expect(cards.get('a1')).toEqual(['findit']);
    expect(cards.get('a2')).toEqual(['yellow-rooms', 'novus-talk']);
    expect(cards.get('a3')).toEqual(['magic-llm']);
    expect(cards.has('a4')).toBe(false);
    expect(cards.has('a5')).toBe(false);
  });
});

describe('selectors', () => {
  it.each([
    ['pending', true],
    ['streaming', true],
    ['complete', false],
    ['stopped', false],
    ['error', false],
  ] as const)('selectBusy is %s → %s', (status, busy) => {
    expect(selectBusy([user('u1'), assistant('a1', 'u1', status)])).toBe(busy);
  });

  it('selectBusy is false for an empty list or a trailing user turn', () => {
    expect(selectBusy([])).toBe(false);
    expect(selectBusy([user('u1')])).toBe(false);
  });

  it('selectLastTurn returns the last assistant turn', () => {
    const last = assistant('a2', 'u2');
    expect(selectLastTurn([user('u1'), assistant('a1', 'u1'), user('u2'), last])).toBe(last);
    expect(selectLastTurn([user('u1')])).toBeNull();
  });
});

describe('createId', () => {
  it('produces unique prefixed ids and is resettable', () => {
    __resetIdsForTests();
    const first = createId('u');
    const second = createId('a');

    expect(first).toMatch(/^u-[0-9a-z]+-1$/);
    expect(second).toMatch(/^a-[0-9a-z]+-2$/);
    __resetIdsForTests();
    expect(createId('u')).toMatch(/-1$/);
  });
});
