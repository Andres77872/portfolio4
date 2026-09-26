#!/usr/bin/env node
/**
 * Builds the MNIST subset served to the in-browser perceptron demo.
 *
 * Input: the four official MNIST IDX files (gzipped), e.g. from
 *   https://ossci-datasets.s3.amazonaws.com/mnist/  (the torchvision mirror)
 * Output:
 *   public/data/mnist/mnist-subset.bin.gz        compact binary, gzip -9
 *   src/games/perceptron/datasetManifest.json    sizes + checksum the loader verifies
 *
 * The subset is stratified (equal digits per class) and drawn with a fixed seed from
 * the official train and test splits, so "test accuracy" in the demo is measured on
 * real held-out MNIST test digits.
 *
 * Usage: node scripts/build-mnist-subset.mjs <dir-with-idx-gz-files> [trainPerClass] [testPerClass]
 *
 * Binary layout (little-endian):
 *   0   4B  magic "MNS1"
 *   4   u32 format version (1)
 *   8   u32 train count
 *   12  u32 test count
 *   16  u16 rows, u16 cols
 *   20  train labels, test labels (1 byte each)
 *   ..  train images, test images (rows*cols bytes each, 0 = background, 255 = ink)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const EXPECTED_MD5 = {
  'train-images-idx3-ubyte.gz': 'f68b3c2dcbeaaa9fbdd348bbdeb94873',
  'train-labels-idx1-ubyte.gz': 'd53e105ee54ea40749a09fcbcd1e9432',
  't10k-images-idx3-ubyte.gz': '9fb629c4189551a2d022fa330f9573f3',
  't10k-labels-idx1-ubyte.gz': 'ec29112dd5afa0611ce80d1b7f02629c',
};

const [sourceDir, trainPerClassArg = '1000', testPerClassArg = '200'] = process.argv.slice(2);
if (!sourceDir) {
  console.error('Usage: node scripts/build-mnist-subset.mjs <dir-with-idx-gz-files> [trainPerClass] [testPerClass]');
  process.exit(1);
}
const trainPerClass = Number(trainPerClassArg);
const testPerClass = Number(testPerClassArg);

const readIdx = (name) => {
  const gz = readFileSync(path.join(sourceDir, name));
  const md5 = createHash('md5').update(gz).digest('hex');
  if (md5 !== EXPECTED_MD5[name]) throw new Error(`${name}: md5 ${md5} does not match the official file`);
  return gunzipSync(gz);
};

const parseImages = (buffer) => {
  if (buffer.readUInt32BE(0) !== 2051) throw new Error('bad image magic');
  const count = buffer.readUInt32BE(4);
  const rows = buffer.readUInt32BE(8);
  const cols = buffer.readUInt32BE(12);
  return { count, rows, cols, pixels: buffer.subarray(16) };
};

const parseLabels = (buffer) => {
  if (buffer.readUInt32BE(0) !== 2049) throw new Error('bad label magic');
  return buffer.subarray(8, 8 + buffer.readUInt32BE(4));
};

/** mulberry32 — tiny deterministic PRNG so the subset is reproducible. */
const createRng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffle = (items, rng) => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

const stratifiedSample = (labels, perClass, rng) => {
  const byClass = Array.from({ length: 10 }, () => []);
  labels.forEach((label, index) => byClass[label].push(index));
  const picked = byClass.flatMap((indices) => {
    if (indices.length < perClass) throw new Error(`only ${indices.length} samples for a class, need ${perClass}`);
    return shuffle(indices, rng).slice(0, perClass);
  });
  return shuffle(picked, rng);
};

const fnv1a = (bytes) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const trainImages = parseImages(readIdx('train-images-idx3-ubyte.gz'));
const trainLabels = parseLabels(readIdx('train-labels-idx1-ubyte.gz'));
const testImages = parseImages(readIdx('t10k-images-idx3-ubyte.gz'));
const testLabels = parseLabels(readIdx('t10k-labels-idx1-ubyte.gz'));

const rng = createRng(20260926);
const trainIdx = stratifiedSample(trainLabels, trainPerClass, rng);
const testIdx = stratifiedSample(testLabels, testPerClass, rng);

const { rows, cols } = trainImages;
const pixelsPerImage = rows * cols;
const HEADER_BYTES = 20;
const total = trainIdx.length + testIdx.length;
const raw = Buffer.alloc(HEADER_BYTES + total + total * pixelsPerImage);

raw.write('MNS1', 0, 'ascii');
raw.writeUInt32LE(1, 4);
raw.writeUInt32LE(trainIdx.length, 8);
raw.writeUInt32LE(testIdx.length, 12);
raw.writeUInt16LE(rows, 16);
raw.writeUInt16LE(cols, 18);

let offset = HEADER_BYTES;
for (const index of trainIdx) raw[offset++] = trainLabels[index];
for (const index of testIdx) raw[offset++] = testLabels[index];
const copyImage = (source, index) => {
  source.pixels.copy(raw, offset, index * pixelsPerImage, (index + 1) * pixelsPerImage);
  offset += pixelsPerImage;
};
for (const index of trainIdx) copyImage(trainImages, index);
for (const index of testIdx) copyImage(testImages, index);

const gz = gzipSync(raw, { level: 9 });
const outFile = 'public/data/mnist/mnist-subset.bin.gz';
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, gz);

const manifest = {
  file: 'data/mnist/mnist-subset.bin.gz',
  format: 'MNS1',
  version: 1,
  trainCount: trainIdx.length,
  testCount: testIdx.length,
  rows,
  cols,
  compressedBytes: gz.length,
  rawBytes: raw.length,
  fnv1a: fnv1a(raw),
  source: 'MNIST (Yann LeCun, Corinna Cortes, Christopher J.C. Burges), official train/test splits',
  license: 'CC BY-SA 3.0',
};
writeFileSync('src/games/perceptron/datasetManifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`wrote ${outFile}: ${trainIdx.length} train + ${testIdx.length} test, ${gz.length} bytes gzipped (${raw.length} raw)`);
