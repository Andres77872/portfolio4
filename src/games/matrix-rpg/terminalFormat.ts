/**
 * terminalFormat.ts — responsive, correctly-aligned terminal output.
 *
 * The old Matrix RPG boxes were hand-typed fixed-width strings whose `│` borders
 * did not line up and overflowed on narrow screens. These builders pad every row
 * to one computed inner width sized to the terminal's live column count, so boxes
 * and tables always align and never exceed the wrap width.
 *
 * HARD CONSTRAINT: callers must pass ASCII + box-drawing + block glyphs only.
 * Width math assumes every glyph is monospace width-1 — emoji / CJK (width-2) or
 * PUA characters break alignment (and PUA would corrupt the stream-marker splice).
 */

const BOX = {
  tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│',
} as const;

export const MIN_COLS = 24;
export const MAX_COLS = 100;

export interface BoxOptions {
  /** Optional title embedded in the top border: `┌─ TITLE ─────┐`. */
  title?: string;
}

export interface TableOptions {
  /** Draw a dashed separator line under the header row. */
  separator?: boolean;
  /** Gap between columns (default 2 spaces). */
  gap?: number;
}

export interface TerminalFormat {
  readonly cols: number;
  boxify(lines: string[], opts?: BoxOptions): string;
  table(headers: string[], rows: string[][], opts?: TableOptions): string;
  bar(value: number, width?: number): string;
  columns(items: string[]): string;
  rule(char?: string): string;
  truncate(text: string, width: number): string;
}

const clampCols = (cols: number): number =>
  Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor(cols) || MIN_COLS));

const truncate = (text: string, width: number): string => {
  if (width <= 0) return '';
  if (text.length <= width) return text;
  if (width === 1) return '…';
  return text.slice(0, width - 1) + '…';
};

const padEnd = (text: string, width: number): string =>
  text.length >= width ? text : text + ' '.repeat(width - text.length);

export function makeFormat(rawCols: number): TerminalFormat {
  const cols = clampCols(rawCols);

  const boxify = (lines: string[], opts: BoxOptions = {}): string => {
    const title = opts.title?.trim() ?? '';
    // Interior content width, leaving 1 space of padding on each side (contentWidth + 2)
    // plus the two vertical bars, all within `cols`.
    const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const titleNeeds = title ? title.length + 3 : 0; // "─ TITLE " decoration inside the border
    const contentWidth = Math.max(
      1,
      Math.min(cols - 4, Math.max(longest, titleNeeds - 2)),
    );
    const inner = contentWidth + 2; // interior between the │ bars, incl. side padding

    let top: string;
    if (title) {
      const label = truncate(title, contentWidth - 1);
      const decorated = `${BOX.h} ${label} `; // ─ TITLE ␣
      const fill = Math.max(0, inner - decorated.length);
      top = `${BOX.tl}${decorated}${BOX.h.repeat(fill)}${BOX.tr}`;
    } else {
      top = `${BOX.tl}${BOX.h.repeat(inner)}${BOX.tr}`;
    }

    const body = lines.map((line) => {
      const interior = ` ${padEnd(truncate(line, contentWidth), contentWidth)} `;
      return `${BOX.v}${interior}${BOX.v}`;
    });

    const bottom = `${BOX.bl}${BOX.h.repeat(inner)}${BOX.br}`;
    return [top, ...body, bottom].join('\n');
  };

  const table = (headers: string[], rows: string[][], opts: TableOptions = {}): string => {
    const gap = opts.gap ?? 2;
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), headers.length);
    const widths: number[] = [];
    for (let i = 0; i < colCount; i++) {
      let w = headers[i]?.length ?? 0;
      for (const row of rows) w = Math.max(w, row[i]?.length ?? 0);
      widths[i] = w;
    }

    // Shrink the widest column until the whole row fits within cols.
    const rowWidth = () => widths.reduce((sum, w) => sum + w, 0) + gap * (colCount - 1);
    while (rowWidth() > cols) {
      const widest = widths.indexOf(Math.max(...widths));
      if (widths[widest] <= 1) break;
      widths[widest] -= 1;
    }

    const renderRow = (cells: string[]): string =>
      truncate(
        widths
          .map((w, i) => padEnd(truncate(cells[i] ?? '', w), w))
          .join(' '.repeat(gap))
          .replace(/\s+$/, ''),
        cols,
      );

    const hasHeader = headers.some((h) => h.trim().length > 0);
    const out: string[] = [];
    if (hasHeader) {
      out.push(renderRow(headers));
      if (opts.separator) out.push(BOX.h.repeat(Math.min(cols, rowWidth())));
    }
    for (const row of rows) out.push(renderRow(row));
    return out.join('\n');
  };

  const bar = (value: number, width = 12): string => {
    const ratio = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    const filled = Math.round(ratio * width);
    return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
  };

  const columns = (items: string[]): string => {
    if (items.length === 0) return '';
    const gap = 2;
    const longest = items.reduce((max, item) => Math.max(max, item.length), 0);
    const colWidth = Math.min(longest, cols);
    const perRow = Math.max(1, Math.floor((cols + gap) / (colWidth + gap)));
    const out: string[] = [];
    for (let i = 0; i < items.length; i += perRow) {
      const chunk = items.slice(i, i + perRow);
      const line = chunk
        .map((item, idx) => (idx === chunk.length - 1 ? truncate(item, colWidth) : padEnd(truncate(item, colWidth), colWidth)))
        .join(' '.repeat(gap));
      out.push(line.replace(/\s+$/, ''));
    }
    return out.join('\n');
  };

  const rule = (char = BOX.h): string => char.repeat(cols).slice(0, cols);

  return { cols, boxify, table, bar, columns, rule, truncate };
}
