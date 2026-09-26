import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DELTA_FLUSH_MS } from './constants';
import { createDeltaBatcher } from './deltaBatcher';

describe('createDeltaBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('joins pushes within the flush window into one call', () => {
    const onFlush = vi.fn();
    const batcher = createDeltaBatcher(onFlush);

    batcher.push('Hel');
    vi.advanceTimersByTime(DELTA_FLUSH_MS - 10);
    batcher.push('lo');
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('Hello');
  });

  it('flush emits synchronously and cancels the pending timer', () => {
    const onFlush = vi.fn();
    const batcher = createDeltaBatcher(onFlush);

    batcher.push('abc');
    batcher.flush();
    expect(onFlush).toHaveBeenCalledWith('abc');

    vi.advanceTimersByTime(DELTA_FLUSH_MS * 2);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('cancel drops the buffer', () => {
    const onFlush = vi.fn();
    const batcher = createDeltaBatcher(onFlush);

    batcher.push('abc');
    batcher.cancel();
    vi.advanceTimersByTime(DELTA_FLUSH_MS * 2);
    batcher.flush();

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('flush with an empty buffer does not call onFlush', () => {
    const onFlush = vi.fn();
    createDeltaBatcher(onFlush).flush();

    expect(onFlush).not.toHaveBeenCalled();
  });
});
