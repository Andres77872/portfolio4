import { describe, expect, it } from 'vitest';

import { makeFormat } from './terminalFormat';

describe('makeFormat.boxify', () => {
  it('pads every row to a single aligned width within cols', () => {
    const lines = makeFormat(40).boxify(['abc', 'a much longer content line'], { title: 'STATUS' }).split('\n');
    const width = lines[0].length;
    expect(lines.every((line) => line.length === width)).toBe(true);
    expect(width).toBeLessThanOrEqual(40);
    for (const body of lines.slice(1, -1)) {
      expect(body.startsWith('│')).toBe(true);
      expect(body.endsWith('│')).toBe(true);
    }
    expect(lines[0].startsWith('┌')).toBe(true);
    expect(lines[lines.length - 1].startsWith('└')).toBe(true);
  });

  it('never exceeds a narrow column budget', () => {
    const lines = makeFormat(24).boxify(['this line is far too wide to ever fit twenty-four columns']).split('\n');
    expect(lines.every((line) => line.length <= 24)).toBe(true);
  });
});

describe('makeFormat.table', () => {
  it('keeps every rendered row within cols', () => {
    const table = makeFormat(30).table(
      ['PID', 'COMMAND'],
      [
        ['1', '/sbin/init --neural'],
        ['2048', 'unknown-entity-handler --very-long-name'],
      ],
      { separator: true },
    );
    for (const line of table.split('\n')) expect(line.length).toBeLessThanOrEqual(30);
  });

  it('omits the header row when headers are empty', () => {
    const table = makeFormat(40).table([], [['-rw-r--r--', 'README.txt']]);
    expect(table.split('\n')).toHaveLength(1);
  });
});

describe('makeFormat.bar', () => {
  it('fills proportionally', () => {
    const fmt = makeFormat(40);
    expect(fmt.bar(0.5, 10)).toBe('█████░░░░░');
    expect(fmt.bar(0, 10)).toBe('░░░░░░░░░░');
    expect(fmt.bar(1, 10)).toBe('██████████');
    expect(fmt.bar(2, 10)).toBe('██████████'); // clamped
  });
});

describe('makeFormat.columns', () => {
  it('packs items without exceeding cols', () => {
    const output = makeFormat(20).columns(['a', 'bb', 'ccc', 'dddd', 'eeeee']);
    for (const line of output.split('\n')) expect(line.length).toBeLessThanOrEqual(20);
  });
});
