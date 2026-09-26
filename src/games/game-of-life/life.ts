/**
 * Life-like cellular automata on a toroidal grid (edges wrap around).
 *
 * A rule in B/S notation lists neighbour counts that give birth to a dead cell and
 * that let a live cell survive: Conway's Game of Life is B3/S23. Alongside the cells
 * the world tracks each live cell's age and a short "trail" left by dead cells (purely
 * for rendering), the population history, and a hash ring that detects when the
 * pattern starts repeating (still life, oscillator or extinction).
 */

export interface LifeRule {
  notation: string;
  /** birth[n]: a dead cell with n live neighbours comes alive. */
  birth: boolean[];
  /** survive[n]: a live cell with n live neighbours stays alive. */
  survive: boolean[];
}

const RULE_PATTERN = /^B([0-8]*)\/S([0-8]*)$/i;

export function parseRule(notation: string): LifeRule {
  const match = RULE_PATTERN.exec(notation.trim());
  if (!match) throw new Error(`Invalid rule "${notation}": expected B/S notation such as B3/S23.`);
  const toTable = (digits: string) => {
    const table = new Array<boolean>(9).fill(false);
    for (const digit of digits) table[Number(digit)] = true;
    return table;
  };
  return { notation: `B${match[1]}/S${match[2]}`, birth: toTable(match[1]), survive: toTable(match[2]) };
}

export const TRAIL_LENGTH = 8;
const HASH_WINDOW = 48;
const HISTORY_LENGTH = 160;

export type LifeStatus =
  | { kind: 'evolving' }
  | { kind: 'extinct' }
  | { kind: 'still' }
  | { kind: 'oscillating'; period: number };

export class LifeWorld {
  cols: number;
  rows: number;
  /** 1 = alive. */
  cells: Uint8Array;
  /** Generations each live cell has been alive (saturates at 255). */
  age: Uint8Array;
  /** Countdown left behind by cells that died recently, for fading trails. */
  trail: Uint8Array;
  generation = 0;
  population = 0;
  /** Population of the most recent generations, oldest first. */
  history: number[] = [];
  status: LifeStatus = { kind: 'evolving' };

  private next: Uint8Array;
  private hashes: { hash: number; population: number; generation: number }[] = [];

  constructor(cols: number, rows: number) {
    this.cols = Math.max(1, Math.floor(cols));
    this.rows = Math.max(1, Math.floor(rows));
    const size = this.cols * this.rows;
    this.cells = new Uint8Array(size);
    this.next = new Uint8Array(size);
    this.age = new Uint8Array(size);
    this.trail = new Uint8Array(size);
  }

  index(x: number, y: number): number {
    const wx = ((x % this.cols) + this.cols) % this.cols;
    const wy = ((y % this.rows) + this.rows) % this.rows;
    return wy * this.cols + wx;
  }

  get(x: number, y: number): boolean {
    return this.cells[this.index(x, y)] === 1;
  }

  set(x: number, y: number, alive: boolean): void {
    const i = this.index(x, y);
    if ((this.cells[i] === 1) === alive) return;
    this.cells[i] = alive ? 1 : 0;
    this.age[i] = 0;
    this.trail[i] = alive ? 0 : TRAIL_LENGTH;
    this.population += alive ? 1 : -1;
    this.edited();
  }

  /** Sets every listed cell (relative to x, y) alive. */
  stamp(cells: readonly (readonly [number, number])[], x: number, y: number): void {
    for (const [dx, dy] of cells) {
      const i = this.index(x + dx, y + dy);
      if (this.cells[i] === 0) {
        this.cells[i] = 1;
        this.age[i] = 0;
        this.trail[i] = 0;
        this.population += 1;
      }
    }
    this.edited();
  }

  clear(): void {
    this.cells.fill(0);
    this.age.fill(0);
    this.trail.fill(0);
    this.population = 0;
    this.generation = 0;
    this.history = [];
    this.edited();
  }

  /** Fills the grid with live cells at the given density. */
  randomize(density = 0.3, random: () => number = Math.random): void {
    this.clear();
    let population = 0;
    for (let i = 0; i < this.cells.length; i += 1) {
      if (random() < density) {
        this.cells[i] = 1;
        population += 1;
      }
    }
    this.population = population;
    this.edited();
  }

  /** Advances one generation under `rule`. */
  step(rule: LifeRule): void {
    const { cols, rows, cells, next, age, trail } = this;
    const { birth, survive } = rule;
    let population = 0;

    for (let y = 0; y < rows; y += 1) {
      const up = (y === 0 ? rows - 1 : y - 1) * cols;
      const mid = y * cols;
      const down = (y === rows - 1 ? 0 : y + 1) * cols;
      for (let x = 0; x < cols; x += 1) {
        const left = x === 0 ? cols - 1 : x - 1;
        const right = x === cols - 1 ? 0 : x + 1;
        const neighbours =
          cells[up + left] + cells[up + x] + cells[up + right] +
          cells[mid + left] + cells[mid + right] +
          cells[down + left] + cells[down + x] + cells[down + right];
        const i = mid + x;
        const wasAlive = cells[i] === 1;
        const alive = wasAlive ? survive[neighbours] : birth[neighbours];

        next[i] = alive ? 1 : 0;
        if (alive) {
          population += 1;
          age[i] = wasAlive ? Math.min(255, age[i] + 1) : 0;
          trail[i] = 0;
        } else {
          age[i] = 0;
          trail[i] = wasAlive ? TRAIL_LENGTH : trail[i] > 0 ? trail[i] - 1 : 0;
        }
      }
    }

    this.next = cells;
    this.cells = next;
    this.population = population;
    this.generation += 1;
    this.recordHistory();
    this.detectCycle();
  }

  /**
   * Changes the grid size, keeping the existing pattern centred (cropping it if the
   * grid shrinks).
   */
  resize(cols: number, rows: number): void {
    const newCols = Math.max(1, Math.floor(cols));
    const newRows = Math.max(1, Math.floor(rows));
    if (newCols === this.cols && newRows === this.rows) return;

    const cells = new Uint8Array(newCols * newRows);
    const age = new Uint8Array(newCols * newRows);
    const trail = new Uint8Array(newCols * newRows);
    const offsetX = Math.floor((newCols - this.cols) / 2);
    const offsetY = Math.floor((newRows - this.rows) / 2);
    let population = 0;

    for (let y = 0; y < this.rows; y += 1) {
      const ny = y + offsetY;
      if (ny < 0 || ny >= newRows) continue;
      for (let x = 0; x < this.cols; x += 1) {
        const nx = x + offsetX;
        if (nx < 0 || nx >= newCols) continue;
        const from = y * this.cols + x;
        const to = ny * newCols + nx;
        cells[to] = this.cells[from];
        age[to] = this.age[from];
        trail[to] = this.trail[from];
        population += cells[to];
      }
    }

    this.cols = newCols;
    this.rows = newRows;
    this.cells = cells;
    this.next = new Uint8Array(newCols * newRows);
    this.age = age;
    this.trail = trail;
    this.population = population;
    this.edited();
  }

  /** 32-bit FNV-1a of the live cells. */
  hash(): number {
    let hash = 0x811c9dc5;
    const { cells } = this;
    for (let i = 0; i < cells.length; i += 1) {
      hash ^= cells[i];
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  private recordHistory(): void {
    this.history.push(this.population);
    if (this.history.length > HISTORY_LENGTH) this.history.splice(0, this.history.length - HISTORY_LENGTH);
  }

  private detectCycle(): void {
    if (this.population === 0) {
      this.status = { kind: 'extinct' };
      return;
    }
    const hash = this.hash();
    const match = this.hashes.find((entry) => entry.hash === hash && entry.population === this.population);
    if (match) {
      const period = this.generation - match.generation;
      this.status = period === 1 ? { kind: 'still' } : { kind: 'oscillating', period };
    } else {
      this.status = { kind: 'evolving' };
    }
    this.hashes.push({ hash, population: this.population, generation: this.generation });
    if (this.hashes.length > HASH_WINDOW) this.hashes.shift();
  }

  /** Any manual edit invalidates cycle detection. */
  private edited(): void {
    this.hashes = [];
    this.status = this.population === 0 ? { kind: 'extinct' } : { kind: 'evolving' };
  }
}
