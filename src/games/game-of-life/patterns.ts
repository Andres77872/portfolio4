/**
 * A small pattern library in Run Length Encoded (RLE) form, the format LifeWiki and
 * Golly use: `b` = dead, `o` = alive, `$` = end of row, `!` = end, and a number in
 * front of any of them repeats it.
 */

export interface Pattern {
  width: number;
  height: number;
  cells: [number, number][];
}

export function parseRle(rle: string): Pattern {
  let width = 0;
  let height = 0;
  const body: string[] = [];

  for (const rawLine of rle.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const header = /^x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)/i.exec(line);
    if (header) {
      width = Number(header[1]);
      height = Number(header[2]);
      continue;
    }
    body.push(line);
  }

  const cells: [number, number][] = [];
  let x = 0;
  let y = 0;
  let count = '';
  let maxX = 0;

  for (const char of body.join('')) {
    if (char >= '0' && char <= '9') {
      count += char;
      continue;
    }
    const run = count === '' ? 1 : Number(count);
    count = '';
    if (char === '!') break;
    if (char === '$') {
      y += run;
      x = 0;
    } else if (char === 'b' || char === '.') {
      x += run;
    } else if (/[a-zA-Z*]/.test(char)) {
      for (let i = 0; i < run; i += 1) cells.push([x + i, y]);
      x += run;
      maxX = Math.max(maxX, x);
    } else {
      throw new Error(`Unexpected character "${char}" in RLE pattern.`);
    }
  }

  const maxY = cells.reduce((max, [, cellY]) => Math.max(max, cellY + 1), 0);
  return { width: Math.max(width, maxX), height: Math.max(height, maxY), cells };
}

export interface LibraryPattern {
  id: string;
  name: string;
  /** One-line description for the picker's tooltip and the status line. */
  description: string;
  rle: string;
}

export const PATTERNS: LibraryPattern[] = [
  {
    id: 'glider',
    name: 'Glider',
    description: 'The smallest spaceship: travels one cell diagonally every 4 generations.',
    rle: 'x = 3, y = 3\nbo$2bo$3o!',
  },
  {
    id: 'lwss',
    name: 'Lightweight spaceship',
    description: 'Flies horizontally at half the speed of light (c/2).',
    rle: 'x = 5, y = 4\nbo2bo$o4b$o3bo$4o!',
  },
  {
    id: 'pulsar',
    name: 'Pulsar',
    description: 'The most common period-3 oscillator.',
    rle: 'x = 13, y = 13\n2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!',
  },
  {
    id: 'pentadecathlon',
    name: 'Pentadecathlon',
    description: 'An oscillator with period 15.',
    rle: 'x = 10, y = 3\n2bo4bo2b$2ob4ob2o$2bo4bo2b!',
  },
  {
    id: 'gosper-gun',
    name: 'Gosper glider gun',
    description: 'Bill Gosper, 1970: fires a new glider every 30 generations, forever.',
    rle: 'x = 36, y = 9\n24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o22b!',
  },
  {
    id: 'r-pentomino',
    name: 'R-pentomino',
    description: 'Five cells that stay chaotic for 1,103 generations.',
    rle: 'x = 3, y = 3\nb2o$2ob$bo!',
  },
  {
    id: 'acorn',
    name: 'Acorn',
    description: 'Seven cells that grow for 5,206 generations.',
    rle: 'x = 7, y = 3\nbo5b$3bo3b$2o2b3o!',
  },
  {
    id: 'diehard',
    name: 'Diehard',
    description: 'Vanishes completely after 130 generations.',
    rle: 'x = 8, y = 3\n6bob$2o6b$bo3b3o!',
  },
];

const parsed = new Map<string, Pattern>();

export function getPattern(id: string): Pattern | null {
  const entry = PATTERNS.find((pattern) => pattern.id === id);
  if (!entry) return null;
  let pattern = parsed.get(id);
  if (!pattern) {
    pattern = parseRle(entry.rle);
    parsed.set(id, pattern);
  }
  return pattern;
}

export interface RulePreset {
  id: string;
  name: string;
  notation: string;
  description: string;
}

export const RULE_PRESETS: RulePreset[] = [
  { id: 'conway', name: 'Conway’s Life', notation: 'B3/S23', description: 'Born with 3 neighbours, survives with 2 or 3.' },
  { id: 'highlife', name: 'HighLife', notation: 'B36/S23', description: 'Like Life, plus birth on 6: home of the replicator.' },
  { id: 'day-night', name: 'Day & Night', notation: 'B3678/S34678', description: 'Symmetric: live and dead regions behave alike.' },
  { id: 'seeds', name: 'Seeds', notation: 'B2/S', description: 'Every cell dies each step; growth is explosive.' },
  { id: 'maze', name: 'Maze', notation: 'B3/S12345', description: 'Grows corridors that settle into mazes.' },
];
