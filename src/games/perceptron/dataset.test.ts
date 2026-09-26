import { gzipSync } from 'node:zlib';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DATASET_MANIFEST,
  DatasetError,
  fetchDataset,
  fnv1a,
  isGzip,
  parseDataset,
  type LoadProgress,
} from './dataset';
import { buildSyntheticFile } from './testData';

const respond = (body: Uint8Array, init?: ResponseInit) => vi.fn(async () => new Response(body as BodyInit, init));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fnv1a', () => {
  it('matches the reference 32-bit FNV-1a values', () => {
    expect(fnv1a(new Uint8Array())).toBe(0x811c9dc5);
    expect(fnv1a(new TextEncoder().encode('a'))).toBe(0xe40c292c);
    expect(fnv1a(new TextEncoder().encode('foobar'))).toBe(0xbf9cf968);
  });
});

describe('isGzip', () => {
  it('detects the gzip magic bytes', () => {
    expect(isGzip(new Uint8Array(gzipSync(Buffer.from('hello'))))).toBe(true);
    expect(isGzip(new Uint8Array([77, 78, 83, 49]))).toBe(false);
  });
});

describe('parseDataset', () => {
  it('returns zero-copy train/test views with the right labels and pixels', () => {
    const { raw, manifest } = buildSyntheticFile({ trainCount: 20, testCount: 10 });
    const dataset = parseDataset(raw, manifest);

    expect(dataset.pixels).toBe(30);
    expect(dataset.train.count).toBe(20);
    expect(dataset.test.count).toBe(10);
    expect(dataset.train.images).toHaveLength(20 * 30);
    expect(Array.from(dataset.train.labels.slice(0, 3))).toEqual([0, 1, 2]);
    // Test labels continue the i % 10 sequence after the 20 train samples.
    expect(dataset.test.labels[0]).toBe(0);
    expect(dataset.train.images.buffer).toBe(raw.buffer);
  });

  it('rejects an unknown format, a size mismatch and an out-of-range label', () => {
    const { raw, manifest } = buildSyntheticFile();

    const badMagic = raw.slice();
    badMagic[0] = 0;
    expect(() => parseDataset(badMagic, manifest)).toThrow(DatasetError);

    expect(() => parseDataset(raw.subarray(0, raw.length - 1), manifest)).toThrow(/size/);
    expect(() => parseDataset(raw, { ...manifest, trainCount: 1 })).toThrow(/manifest/);

    const badLabel = raw.slice();
    badLabel[20] = 12;
    expect(() => parseDataset(badLabel, manifest)).toThrow(/label/);
  });

  it('ships a manifest describing the real 10k/2k MNIST subset', () => {
    expect(DATASET_MANIFEST).toMatchObject({ format: 'MNS1', rows: 28, cols: 28, trainCount: 10000, testCount: 2000 });
    expect(DATASET_MANIFEST.rawBytes).toBe(20 + 12000 + 12000 * 784);
  });
});

describe('fetchDataset', () => {
  it('downloads, decompresses and verifies a gzipped file while reporting progress', async () => {
    const { raw, manifest } = buildSyntheticFile();
    const gz = new Uint8Array(gzipSync(raw));
    const fetchMock = respond(gz);
    vi.stubGlobal('fetch', fetchMock);
    const stages: LoadProgress['stage'][] = [];

    const dataset = await fetchDataset({
      baseUrl: '/base',
      manifest: { ...manifest, compressedBytes: gz.length },
      onProgress: (progress) => stages.push(progress.stage),
    });

    expect(fetchMock).toHaveBeenCalledWith('/base/data/test.bin.gz', expect.anything());
    expect(dataset.train.count).toBe(200);
    expect(stages).toContain('download');
    expect(stages).toContain('decompress');
    expect(stages[stages.length - 1]).toBe('verify');
  });

  it('accepts a body the server already decoded (Content-Encoding: gzip)', async () => {
    const { raw, manifest } = buildSyntheticFile();
    vi.stubGlobal('fetch', respond(raw));

    const progress: LoadProgress[] = [];
    const dataset = await fetchDataset({
      manifest: { ...manifest, compressedBytes: 100 },
      onProgress: (event) => progress.push(event),
    });

    expect(dataset.test.count).toBe(50);
    const downloads = progress.filter((event) => event.stage === 'download');
    const lastDownload = downloads[downloads.length - 1];
    expect(lastDownload?.loaded).toBeLessThanOrEqual(lastDownload?.total ?? 0);
    expect(progress.some((event) => event.stage === 'decompress')).toBe(false);
  });

  it('fails the integrity check on corrupted bytes', async () => {
    const { raw, manifest } = buildSyntheticFile();
    const damaged = raw.slice();
    damaged[damaged.length - 1] ^= 0xff;
    vi.stubGlobal('fetch', respond(damaged));

    await expect(fetchDataset({ manifest })).rejects.toMatchObject({ kind: 'corrupt' });
  });

  it('maps HTTP and network failures to retryable network errors', async () => {
    const { manifest } = buildSyntheticFile();
    vi.stubGlobal('fetch', respond(new Uint8Array(), { status: 404 }));
    await expect(fetchDataset({ manifest })).rejects.toMatchObject({ kind: 'network', message: expect.stringMatching(/404/) });

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(fetchDataset({ manifest })).rejects.toMatchObject({ kind: 'network' });
  });

  it('propagates aborts instead of reporting them as network errors', async () => {
    const { manifest } = buildSyntheticFile();
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Aborted', 'AbortError'); }));

    await expect(fetchDataset({ manifest, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
