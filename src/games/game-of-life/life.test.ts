import { describe, expect, it } from 'vitest';

import { LifeWorld, TRAIL_LENGTH, parseRule } from './life';
import { PATTERNS, RULE_PRESETS, getPattern, parseRle } from './patterns';

const CONWAY = parseRule('B3/S23');

const liveCells = (world: LifeWorld) => {
  const cells: string[] = [];
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) if (world.get(x, y)) cells.push(`${x},${y}`);
  }
  return cells;
};

const worldWith = (id: string, size = 40) => {
  const world = new LifeWorld(size, size);
  world.stamp(getPattern(id)!.cells, 10, 10);
  return world;
};

describe('parseRule', () => {
  it('parses B/S notation into birth and survival tables', () => {
    const rule = parseRule('b36/s23');
    expect(rule.notation).toBe('B36/S23');
    expect(rule.birth.flatMap((on, n) => (on ? [n] : []))).toEqual([3, 6]);
    expect(rule.survive.flatMap((on, n) => (on ? [n] : []))).toEqual([2, 3]);
    expect(parseRule('B2/S').survive.every((on) => !on)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(() => parseRule('23/3')).toThrow(/B\/S/);
    expect(() => parseRule('B9/S23')).toThrow();
  });

  it('ships only valid presets', () => {
    for (const preset of RULE_PRESETS) expect(parseRule(preset.notation).notation).toBe(preset.notation);
  });
});

describe('parseRle', () => {
  it('decodes runs, row breaks and blank rows', () => {
    const glider = parseRle('#N Glider\nx = 3, y = 3, rule = B3/S23\nbo$2bo$3o!');
    expect(glider).toEqual({ width: 3, height: 3, cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] });

    const gapped = parseRle('o2$o!');
    expect(gapped.cells).toEqual([[0, 0], [0, 2]]);
    expect(gapped.height).toBe(3);
  });

  it('parses every library pattern within its declared bounds', () => {
    for (const { id } of PATTERNS) {
      const pattern = getPattern(id)!;
      expect(pattern.cells.length).toBeGreaterThan(0);
      for (const [x, y] of pattern.cells) {
        expect(x).toBeLessThan(pattern.width);
        expect(y).toBeLessThan(pattern.height);
      }
    }
    expect(getPattern('gosper-gun')!.cells).toHaveLength(36);
    expect(getPattern('pulsar')!.cells).toHaveLength(48);
  });
});

describe('LifeWorld', () => {
  it('keeps a block still and reports a still life', () => {
    const world = new LifeWorld(8, 8);
    world.stamp([[0, 0], [1, 0], [0, 1], [1, 1]], 3, 3);
    const before = liveCells(world);
    world.step(CONWAY);
    world.step(CONWAY);

    expect(liveCells(world)).toEqual(before);
    expect(world.status).toEqual({ kind: 'still' });
  });

  it('flips a blinker every generation (period 2)', () => {
    const world = new LifeWorld(8, 8);
    world.stamp([[0, 0], [1, 0], [2, 0]], 2, 4);
    world.step(CONWAY);
    expect(liveCells(world)).toEqual(['3,3', '3,4', '3,5']);
    world.step(CONWAY);
    world.step(CONWAY);
    expect(world.status).toEqual({ kind: 'oscillating', period: 2 });
  });

  it('moves a glider one cell diagonally every 4 generations, wrapping around the torus', () => {
    const world = new LifeWorld(10, 10);
    world.stamp(getPattern('glider')!.cells, 0, 0);
    const start = liveCells(world);

    for (let i = 0; i < 4; i += 1) world.step(CONWAY);
    const shifted = start.map((cell) => cell.split(',').map((value) => Number(value) + 1).join(','));
    expect(liveCells(world).sort()).toEqual(shifted.sort());

    // 10 cells in each direction = 40 generations to come back around.
    for (let i = 0; i < 36; i += 1) world.step(CONWAY);
    expect(liveCells(world).sort()).toEqual([...start].sort());
    expect(world.population).toBe(5);
  });

  it('detects the pulsar (period 3) and the pentadecathlon (period 15)', () => {
    const pulsar = worldWith('pulsar');
    for (let i = 0; i < 6; i += 1) pulsar.step(CONWAY);
    expect(pulsar.status).toEqual({ kind: 'oscillating', period: 3 });

    const pentadecathlon = worldWith('pentadecathlon');
    for (let i = 0; i < 30; i += 1) pentadecathlon.step(CONWAY);
    expect(pentadecathlon.status).toEqual({ kind: 'oscillating', period: 15 });
  });

  it('lets the diehard vanish after exactly 130 generations', () => {
    const world = worldWith('diehard', 64);
    for (let i = 0; i < 129; i += 1) world.step(CONWAY);
    expect(world.population).toBeGreaterThan(0);
    world.step(CONWAY);
    expect(world.population).toBe(0);
    expect(world.status).toEqual({ kind: 'extinct' });
  });

  it('fires gliders from the Gosper gun (population grows every 30 generations)', () => {
    const world = worldWith('gosper-gun', 80);
    const initial = world.population;
    for (let i = 0; i < 120; i += 1) world.step(CONWAY);
    expect(world.population).toBe(initial + 4 * 5);
  });

  it('ages live cells and leaves a fading trail behind dead ones', () => {
    const world = new LifeWorld(8, 8);
    world.stamp([[0, 0], [1, 0], [2, 0]], 2, 4);
    world.step(CONWAY);

    expect(world.age[world.index(3, 4)]).toBe(1);
    expect(world.age[world.index(3, 3)]).toBe(0);
    expect(world.trail[world.index(2, 4)]).toBe(TRAIL_LENGTH);
    world.step(CONWAY);
    expect(world.trail[world.index(3, 3)]).toBe(TRAIL_LENGTH);
  });

  it('edits, clears and randomises', () => {
    const world = new LifeWorld(20, 10);
    world.set(-1, -1, true);
    expect(world.get(19, 9)).toBe(true);
    expect(world.population).toBe(1);

    let seed = 1;
    world.randomize(0.5, () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    expect(world.population).toBeGreaterThan(60);
    expect(world.population).toBeLessThan(140);

    world.clear();
    expect(world.population).toBe(0);
    expect(world.generation).toBe(0);
    expect(world.status).toEqual({ kind: 'extinct' });
  });

  it('keeps the pattern centred when resized', () => {
    const world = new LifeWorld(10, 10);
    world.set(5, 5, true);
    world.resize(20, 14);
    expect(world.get(10, 7)).toBe(true);
    expect(world.population).toBe(1);

    // Shrinking crops around the centre: the middle cell stays, a corner cell is dropped.
    world.set(0, 0, true);
    world.resize(4, 4);
    expect(world.get(2, 2)).toBe(true);
    expect(world.population).toBe(1);
  });

  it('records population history', () => {
    const world = new LifeWorld(8, 8);
    world.stamp([[0, 0], [1, 0], [2, 0]], 2, 4);
    world.step(CONWAY);
    world.step(CONWAY);
    expect(world.history).toEqual([3, 3]);
  });
});
