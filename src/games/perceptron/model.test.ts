import { describe, expect, it } from 'vitest';

import { CLASSES, LinearModel, softmaxInto } from './model';

const image = (values: number[]) => Uint8Array.from(values);

describe('LinearModel', () => {
  it('predicts class 0 with untrained (all-zero) weights', () => {
    const model = new LinearModel(4);
    const scores = new Float32Array(CLASSES);
    expect(model.scoreImage(image([255, 0, 0, 0]), 0, scores)).toBe(0);
    expect(Array.from(scores)).toEqual(new Array(CLASSES).fill(0));
  });

  it('perceptron rule: on a mistake adds x to the true class and subtracts it from the guess', () => {
    const model = new LinearModel(4);
    const scores = new Float32Array(CLASSES);
    const x = image([255, 0, 51, 0]);

    const predicted = model.trainImage(x, 0, 3, 'perceptron', scores);

    expect(predicted).toBe(0);
    expect(model.lastUpdated).toBe(true);
    const { stride, weights } = model;
    expect(Array.from(weights.subarray(3 * stride, 4 * stride))).toEqual([1, 0, expect.closeTo(0.2, 5), 0, 1]);
    expect(Array.from(weights.subarray(0, stride))).toEqual([-1, 0, expect.closeTo(-0.2, 5), 0, -1]);
    // Every other class is untouched.
    expect(weights.subarray(stride, 2 * stride).every((w) => w === 0)).toBe(true);
  });

  it('perceptron rule: leaves the weights alone when the guess is right', () => {
    const model = new LinearModel(4);
    const scores = new Float32Array(CLASSES);
    const x = image([255, 0, 0, 0]);
    model.trainImage(x, 0, 3, 'perceptron', scores);
    const before = Float32Array.from(model.weights);

    expect(model.trainImage(x, 0, 3, 'perceptron', scores)).toBe(3);
    expect(model.lastUpdated).toBe(false);
    expect(model.weights).toEqual(before);
  });

  it('softmax rule: updates every class, raising the true class and lowering the rest', () => {
    const model = new LinearModel(2);
    const scores = new Float32Array(CLASSES);
    model.trainImage(image([255, 0]), 0, 7, 'softmax', scores, 0.5);

    const { stride, weights } = model;
    for (let k = 0; k < CLASSES; k += 1) {
      const pixelWeight = weights[k * stride];
      if (k === 7) expect(pixelWeight).toBeCloseTo(0.5 * 0.9, 5);
      else expect(pixelWeight).toBeCloseTo(-0.5 * 0.1, 5);
      // The blank pixel never moves.
      expect(weights[k * stride + 1]).toBe(0);
    }
  });

  it('reads byte images at an offset and float vectors identically', () => {
    const model = new LinearModel(3);
    const scores = new Float32Array(CLASSES);
    model.trainImage(image([0, 255, 0]), 0, 4, 'perceptron', scores);

    const packed = image([9, 9, 0, 255, 0]);
    const fromBytes = new Float32Array(CLASSES);
    const fromFloats = new Float32Array(CLASSES);
    expect(model.scoreImage(packed, 2, fromBytes)).toBe(4);
    expect(model.scoreVector(Float32Array.from([0, 1, 0]), fromFloats)).toBe(4);
    expect(Array.from(fromBytes)).toEqual(Array.from(fromFloats));
  });
});

describe('softmaxInto', () => {
  it('produces a stable probability distribution even for huge scores', () => {
    const probabilities = softmaxInto([1000, 1000, ...new Array(8).fill(-1000)], new Float32Array(CLASSES));
    expect(probabilities[0]).toBeCloseTo(0.5, 6);
    expect(probabilities[1]).toBeCloseTo(0.5, 6);
    expect(probabilities.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 6);
  });
});
