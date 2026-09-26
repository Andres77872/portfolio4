import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { DATASET_MANIFEST, fnv1a, parseDataset } from './dataset';
import { Trainer } from './trainer';

// End-to-end check on the file the site actually serves (public/data/mnist/...).
const file = path.resolve(__dirname, '../../../public', DATASET_MANIFEST.file);

describe('shipped MNIST subset', () => {
  const gz = readFileSync(file);
  const raw = new Uint8Array(gunzipSync(gz));

  it('matches its manifest byte-for-byte', () => {
    expect(gz.length).toBe(DATASET_MANIFEST.compressedBytes);
    expect(raw.length).toBe(DATASET_MANIFEST.rawBytes);
    expect(fnv1a(raw)).toBe(DATASET_MANIFEST.fnv1a);
  });

  it('is class-balanced in both splits', () => {
    const dataset = parseDataset(raw);
    const histogram = (labels: Uint8Array) => labels.reduce((counts, label) => {
      counts[label] += 1;
      return counts;
    }, new Array(10).fill(0));

    expect(histogram(dataset.train.labels)).toEqual(new Array(10).fill(1000));
    expect(histogram(dataset.test.labels)).toEqual(new Array(10).fill(200));
  });

  it('trains a perceptron past 80% held-out accuracy in one epoch', () => {
    const trainer = new Trainer(parseDataset(raw));
    trainer.run(DATASET_MANIFEST.trainCount, 60_000);
    trainer.flushEvaluation();

    expect(trainer.seen).toBe(DATASET_MANIFEST.trainCount);
    expect(trainer.lastEvaluation!.accuracy).toBeGreaterThan(0.8);
  });
});
