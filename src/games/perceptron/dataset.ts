/**
 * Loads the MNIST subset built by `scripts/build-mnist-subset.mjs`.
 *
 * The file is gzip-compressed and decompressed in the browser with
 * `DecompressionStream`, so it works regardless of how the host serves `.gz` files:
 * if the server already decoded it (Content-Encoding: gzip), the magic bytes say so
 * and the decompression step is skipped. The payload is verified against the
 * manifest (layout, counts, label range and an FNV-1a checksum) before use.
 */
import manifest from './datasetManifest.json';

export interface DatasetManifest {
  file: string;
  format: string;
  version: number;
  trainCount: number;
  testCount: number;
  rows: number;
  cols: number;
  compressedBytes: number;
  rawBytes: number;
  fnv1a: number;
}

export const DATASET_MANIFEST: DatasetManifest = manifest;

export interface MnistSplit {
  count: number;
  /** One byte per sample, 0–9. */
  labels: Uint8Array;
  /** `count × pixels` bytes, 0 = background, 255 = full ink. */
  images: Uint8Array;
}

export interface MnistDataset {
  rows: number;
  cols: number;
  pixels: number;
  train: MnistSplit;
  test: MnistSplit;
}

export type LoadStage = 'download' | 'decompress' | 'verify';

export interface LoadProgress {
  stage: LoadStage;
  loaded: number;
  total: number;
}

export type DatasetErrorKind = 'network' | 'corrupt' | 'unsupported';

export class DatasetError extends Error {
  readonly kind: DatasetErrorKind;

  constructor(kind: DatasetErrorKind, message: string) {
    super(message);
    this.name = 'DatasetError';
    this.kind = kind;
  }
}

const HEADER_BYTES = 20;
const MAGIC = 'MNS1';

/** 32-bit FNV-1a, the checksum the build script writes into the manifest. */
export function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export const isGzip = (bytes: Uint8Array): boolean => bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

/** Validates the binary layout and returns zero-copy views into it. */
export function parseDataset(raw: Uint8Array, expected: DatasetManifest = DATASET_MANIFEST): MnistDataset {
  if (raw.length < HEADER_BYTES) throw new DatasetError('corrupt', 'Dataset file is truncated.');

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const magic = String.fromCharCode(raw[0], raw[1], raw[2], raw[3]);
  if (magic !== MAGIC || view.getUint32(4, true) !== expected.version) {
    throw new DatasetError('corrupt', 'Dataset file has an unknown format.');
  }

  const trainCount = view.getUint32(8, true);
  const testCount = view.getUint32(12, true);
  const rows = view.getUint16(16, true);
  const cols = view.getUint16(18, true);
  if (
    trainCount !== expected.trainCount ||
    testCount !== expected.testCount ||
    rows !== expected.rows ||
    cols !== expected.cols
  ) {
    throw new DatasetError('corrupt', 'Dataset header does not match the manifest.');
  }

  const pixels = rows * cols;
  const total = trainCount + testCount;
  if (raw.length !== HEADER_BYTES + total + total * pixels) {
    throw new DatasetError('corrupt', 'Dataset size does not match its header.');
  }

  const labelsStart = HEADER_BYTES;
  const imagesStart = labelsStart + total;
  const labels = raw.subarray(labelsStart, imagesStart);
  for (let i = 0; i < labels.length; i += 1) {
    if (labels[i] > 9) throw new DatasetError('corrupt', 'Dataset contains an invalid label.');
  }

  return {
    rows,
    cols,
    pixels,
    train: {
      count: trainCount,
      labels: labels.subarray(0, trainCount),
      images: raw.subarray(imagesStart, imagesStart + trainCount * pixels),
    },
    test: {
      count: testCount,
      labels: labels.subarray(trainCount),
      images: raw.subarray(imagesStart + trainCount * pixels),
    },
  };
}

async function readBody(
  response: Response,
  expected: DatasetManifest,
  onProgress: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress(bytes.length, bytes.length);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    // A host that sends Content-Encoding: gzip hands us decoded bytes, which run past
    // the compressed size; switch the denominator so the bar stays truthful.
    const total = received > expected.compressedBytes ? expected.rawBytes : expected.compressedBytes;
    onProgress(received, total);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new DatasetError('unsupported', 'This browser cannot decompress the dataset (no DecompressionStream).');
  }
  try {
    const body = new Response(bytes as BodyInit).body;
    if (!body) throw new Error('empty body');
    return new Uint8Array(await new Response(body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  } catch {
    throw new DatasetError('corrupt', 'The dataset download is damaged and could not be decompressed.');
  }
}

export interface FetchDatasetOptions {
  signal?: AbortSignal;
  onProgress?: (progress: LoadProgress) => void;
  baseUrl?: string;
  manifest?: DatasetManifest;
}

/** Downloads, decompresses and verifies the dataset. Rejects with `DatasetError` or an AbortError. */
export async function fetchDataset({
  signal,
  onProgress,
  baseUrl = import.meta.env.BASE_URL,
  manifest: expected = DATASET_MANIFEST,
}: FetchDatasetOptions = {}): Promise<MnistDataset> {
  const url = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${expected.file}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new DatasetError('network', 'Could not reach the dataset. Check your connection and retry.');
  }
  if (!response.ok) throw new DatasetError('network', `The dataset request failed (HTTP ${response.status}).`);

  let body: Uint8Array;
  try {
    body = await readBody(response, expected, (loaded, total) => onProgress?.({ stage: 'download', loaded, total }));
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new DatasetError('network', 'The download was interrupted. Retry to start it again.');
  }

  let raw = body;
  if (isGzip(body)) {
    onProgress?.({ stage: 'decompress', loaded: 0, total: expected.rawBytes });
    raw = await gunzip(body);
  }
  signal?.throwIfAborted();

  onProgress?.({ stage: 'verify', loaded: raw.length, total: expected.rawBytes });
  if (raw.length !== expected.rawBytes || fnv1a(raw) !== expected.fnv1a) {
    throw new DatasetError('corrupt', 'The dataset failed its integrity check. Retry the download.');
  }
  return parseDataset(raw, expected);
}

// The decoded dataset (~9 MB) is kept for the page's lifetime so switching experiments
// and coming back never downloads it twice. A download keeps going if the demo unmounts
// mid-way; whoever mounts next re-subscribes to its progress and awaits the same request.
let cachedDataset: MnistDataset | null = null;
let inflight: Promise<MnistDataset> | null = null;
let lastProgress: LoadProgress | null = null;
const progressListeners = new Set<(progress: LoadProgress) => void>();

export const getCachedDataset = (): MnistDataset | null => cachedDataset;
export const isDatasetLoading = (): boolean => inflight !== null;

/** Receives download progress (immediately replaying the latest event, if any). */
export function subscribeToDatasetProgress(listener: (progress: LoadProgress) => void): () => void {
  progressListeners.add(listener);
  if (inflight && lastProgress) listener(lastProgress);
  return () => {
    progressListeners.delete(listener);
  };
}

export function loadDataset(): Promise<MnistDataset> {
  if (cachedDataset) return Promise.resolve(cachedDataset);
  if (!inflight) {
    lastProgress = null;
    inflight = fetchDataset({
      onProgress: (progress) => {
        lastProgress = progress;
        progressListeners.forEach((listener) => listener(progress));
      },
    })
      .then((dataset) => {
        cachedDataset = dataset;
        return dataset;
      })
      .finally(() => {
        inflight = null;
        lastProgress = null;
      });
  }
  return inflight;
}

export function __resetDatasetCacheForTests(): void {
  cachedDataset = null;
  inflight = null;
  lastProgress = null;
  progressListeners.clear();
}
