import { describe, expect, it } from 'vitest';

import { toPlainText, truncateOnWord } from './chatText';

describe('toPlainText', () => {
  it('keeps link text and strips emphasis, code ticks and list markers', () => {
    expect(toPlainText('See [FindIT](?project=findit), **fast** `code`\n- item')).toBe('See FindIT, fast code item');
  });

  it('strips headings, quotes, ordered markers, fences and single emphasis', () => {
    const markdown = '## Title\n> quoted *note*\n1. first\n2) second\n```ts\nconst a = 1;\n```\nsnake_case_name stays';

    expect(toPlainText(markdown)).toBe('Title quoted note first second const a = 1; snake_case_name stays');
  });

  it('keeps image alt text', () => {
    expect(toPlainText('Look ![a diagram](https://x.test/d.png) here')).toBe('Look a diagram here');
  });
});

describe('truncateOnWord', () => {
  it('returns short text unchanged', () => {
    expect(truncateOnWord('short text', 400)).toEqual({ text: 'short text', truncated: false });
  });

  it('cuts at a word boundary at or below the limit', () => {
    const text = Array.from({ length: 120 }, (_, index) => `word${index}`).join(' ');
    const { text: cut, truncated } = truncateOnWord(text, 400);

    expect(truncated).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(400);
    expect(text.startsWith(cut)).toBe(true);
    expect(text.charAt(cut.length)).toBe(' ');
  });

  it('keeps the full cut when it already ends on a boundary', () => {
    expect(truncateOnWord('alpha beta gamma', 10)).toEqual({ text: 'alpha beta', truncated: true });
  });

  it('hard-cuts a single long word', () => {
    expect(truncateOnWord('x'.repeat(500), 400)).toEqual({ text: 'x'.repeat(400), truncated: true });
  });
});
