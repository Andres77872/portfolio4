import { describe, expect, it } from 'vitest';

import { MAX_EPOCHS, RECENT_WINDOW, Trainer, nextCheckpoint } from './trainer';
import { buildSyntheticDataset } from './testData';

describe('nextCheckpoint', () => {
  it('measures densely early on and every 500 samples later', () => {
    expect(nextCheckpoint(0)).toBe(25);
    expect(nextCheckpoint(25)).toBe(50);
    expect(nextCheckpoint(99)).toBe(100);
    expect(nextCheckpoint(100)).toBe(200);
    expect(nextCheckpoint(999)).toBe(1000);
    expect(nextCheckpoint(1000)).toBe(1500);
    expect(nextCheckpoint(12_340)).toBe(12_500);
  });
});

describe('Trainer', () => {
  it('records a baseline evaluation of the untrained model before the first sample', () => {
    const trainer = new Trainer(buildSyntheticDataset());
    trainer.run(0, 1000);

    expect(trainer.history).toEqual([{ seen: 0, testAccuracy: 0.1, trainAccuracy: null }]);
    expect(trainer.lastEvaluation?.perClass[0]).toBe(1);
  });

  it('learns a separable problem with the perceptron rule', () => {
    const trainer = new Trainer(buildSyntheticDataset());
    trainer.run(400, 1000);

    expect(trainer.seen).toBe(400);
    expect(trainer.epoch).toBe(3);
    expect(trainer.updates).toBeGreaterThan(0);
    expect(trainer.updates).toBeLessThan(400);
    trainer.flushEvaluation();
    expect(trainer.lastEvaluation?.accuracy).toBe(1);
    expect(trainer.history.map((point) => point.seen)).toEqual([0, 25, 50, 75, 100, 200, 300, 400]);
  });

  it('learns with the softmax rule, which updates on every sample', () => {
    const trainer = new Trainer(buildSyntheticDataset(), 'softmax');
    trainer.run(600, 1000);
    trainer.flushEvaluation();

    expect(trainer.updates).toBe(600);
    expect(trainer.lastEvaluation?.accuracy).toBeGreaterThan(0.95);
  });

  it('step() trains one sample and describes it', () => {
    const trainer = new Trainer(buildSyntheticDataset());
    const view = trainer.step();

    expect(trainer.seen).toBe(1);
    expect(view).not.toBeNull();
    expect(view!.predicted).toBe(0);
    expect(view!.updated).toBe(view!.label !== 0);
    expect(view!.scores).toHaveLength(10);
    expect(view!.probabilities.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 5);
  });

  it('tracks training accuracy over a sliding window', () => {
    const trainer = new Trainer(buildSyntheticDataset({ trainCount: 1000 }));
    expect(trainer.trainAccuracy).toBeNull();
    trainer.run(RECENT_WINDOW + 200, 1000);

    expect(trainer.trainAccuracy).toBeGreaterThan(0.9);
    expect(trainer.trainAccuracy).toBeLessThanOrEqual(1);
  });

  it('spreads an evaluation over several slices when out of time, without losing the snapshot', () => {
    const trainer = new Trainer(buildSyntheticDataset({ testCount: 500 }));
    trainer.run(0, -1);
    expect(trainer.isEvaluating).toBe(true);
    expect(trainer.history).toHaveLength(0);

    trainer.run(0, 1000);
    expect(trainer.isEvaluating).toBe(false);
    expect(trainer.history).toEqual([expect.objectContaining({ seen: 0 })]);
  });

  it('is deterministic for a given seed and resets cleanly', () => {
    const a = new Trainer(buildSyntheticDataset(), 'perceptron', 42);
    const b = new Trainer(buildSyntheticDataset(), 'perceptron', 42);
    a.run(150, 1000);
    b.run(150, 1000);
    expect(a.model.weights).toEqual(b.model.weights);

    a.reset('softmax');
    expect(a.rule).toBe('softmax');
    expect(a.seen).toBe(0);
    expect(a.history).toEqual([]);
    expect(a.model.weights.every((w) => w === 0)).toBe(true);
  });

  it('stops after the maximum number of epochs', () => {
    const trainer = new Trainer(buildSyntheticDataset({ trainCount: 20, testCount: 10 }));
    trainer.run(Number.POSITIVE_INFINITY, 1000);

    expect(trainer.seen).toBe(MAX_EPOCHS * 20);
    expect(trainer.isFinished).toBe(true);
    expect(trainer.epochProgress).toBe(1);
    expect(trainer.step()).toBeNull();
  });
});
