import { describe, expect, it } from 'vitest';

import { DIGIT_SIZE, INK_SIZE, createInk, inkToDigit, stampBrush, strokeSegment } from './preprocess';

const centreOfMass = (digit: Float32Array) => {
  let mass = 0;
  let x = 0;
  let y = 0;
  digit.forEach((value, index) => {
    mass += value;
    x += value * ((index % DIGIT_SIZE) + 0.5);
    y += value * (Math.floor(index / DIGIT_SIZE) + 0.5);
  });
  return { x: x / mass, y: y / mass };
};

const boundingBox = (digit: Float32Array) => {
  let minX = DIGIT_SIZE;
  let maxX = -1;
  let minY = DIGIT_SIZE;
  let maxY = -1;
  digit.forEach((value, index) => {
    if (value <= 0.05) return;
    const x = index % DIGIT_SIZE;
    const y = Math.floor(index / DIGIT_SIZE);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
};

describe('inkToDigit', () => {
  it('returns null for an empty drawing', () => {
    expect(inkToDigit(createInk())).toBeNull();
  });

  it('scales a small off-centre stroke to the 20px box and centres it by mass', () => {
    const ink = createInk();
    // A short vertical bar in the top-left corner.
    strokeSegment(ink, INK_SIZE, { x: 12, y: 8 }, { x: 12, y: 30 }, 3);

    const digit = inkToDigit(ink)!;
    const { x, y } = centreOfMass(digit);
    expect(x).toBeGreaterThan(13);
    expect(x).toBeLessThan(15);
    expect(y).toBeGreaterThan(13);
    expect(y).toBeLessThan(15);
    expect(boundingBox(digit).height).toBe(20);
    expect(Math.max(...digit)).toBeLessThanOrEqual(1);
  });

  it('keeps the aspect ratio of wide shapes', () => {
    const ink = createInk();
    strokeSegment(ink, INK_SIZE, { x: 10, y: 60 }, { x: 100, y: 60 }, 4);

    const { width, height } = boundingBox(inkToDigit(ink)!);
    expect(width).toBe(20);
    expect(height).toBeLessThan(6);
  });
});

describe('stampBrush', () => {
  it('paints a solid core that fades at the edge and never exceeds 1', () => {
    const ink = createInk(16);
    stampBrush(ink, 16, 8, 8, 3);
    stampBrush(ink, 16, 8, 8, 3);

    expect(ink[8 * 16 + 8]).toBe(1);
    expect(ink[0]).toBe(0);
    expect(Math.max(...ink)).toBe(1);
    const edge = ink[8 * 16 + 11];
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
  });
});
