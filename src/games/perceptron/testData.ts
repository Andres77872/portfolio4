/**
 * Synthetic MNIST-shaped fixtures for tests: digit k lights a small, class-specific
 * block of pixels (plus a little shared noise), so the classes are linearly separable.
 */
import { fnv1a, type DatasetManifest, type MnistDataset } from './dataset';

export interface SyntheticOptions {
  trainCount?: number;
  testCount?: number;
  rows?: number;
  cols?: number;
}

const classPattern = (label: number, pixels: number, index: number, out: Uint8Array, offset: number) => {
  const block = Math.floor(pixels / 10);
  for (let p = 0; p < block; p += 1) out[offset + label * block + p] = 200 + ((index + p) % 56);
  // Shared "stroke" every class has, so the classes overlap a little.
  out[offset + pixels - 1] = 255;
};

/** Encodes a dataset in the MNS1 layout and returns it with a matching manifest. */
export function buildSyntheticFile({ trainCount = 200, testCount = 50, rows = 6, cols = 5 }: SyntheticOptions = {}) {
  const pixels = rows * cols;
  const total = trainCount + testCount;
  const raw = new Uint8Array(20 + total + total * pixels);
  const view = new DataView(raw.buffer);
  raw.set([77, 78, 83, 49], 0); // "MNS1"
  view.setUint32(4, 1, true);
  view.setUint32(8, trainCount, true);
  view.setUint32(12, testCount, true);
  view.setUint16(16, rows, true);
  view.setUint16(18, cols, true);

  for (let i = 0; i < total; i += 1) {
    const label = i % 10;
    raw[20 + i] = label;
    classPattern(label, pixels, i, raw, 20 + total + i * pixels);
  }

  const manifest: DatasetManifest = {
    file: 'data/test.bin.gz',
    format: 'MNS1',
    version: 1,
    trainCount,
    testCount,
    rows,
    cols,
    compressedBytes: raw.length,
    rawBytes: raw.length,
    fnv1a: fnv1a(raw),
  };
  return { raw, manifest };
}

export function buildSyntheticDataset(options?: SyntheticOptions): MnistDataset {
  const { raw } = buildSyntheticFile(options);
  const view = new DataView(raw.buffer);
  const trainCount = view.getUint32(8, true);
  const testCount = view.getUint32(12, true);
  const rows = view.getUint16(16, true);
  const cols = view.getUint16(18, true);
  const pixels = rows * cols;
  const total = trainCount + testCount;
  const imagesStart = 20 + total;
  return {
    rows,
    cols,
    pixels,
    train: {
      count: trainCount,
      labels: raw.subarray(20, 20 + trainCount),
      images: raw.subarray(imagesStart, imagesStart + trainCount * pixels),
    },
    test: {
      count: testCount,
      labels: raw.subarray(20 + trainCount, imagesStart),
      images: raw.subarray(imagesStart + trainCount * pixels),
    },
  };
}
