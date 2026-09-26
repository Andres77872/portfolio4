import { afterEach, describe, expect, it, vi } from 'vitest';

import { __setChatPanelImporterForTests, loadChatPanel } from './loadChatPanel';

type PanelModule = Awaited<ReturnType<typeof loadChatPanel>>;

const fakeModule = { default: () => null } as unknown as PanelModule;

describe('loadChatPanel', () => {
  afterEach(() => {
    __setChatPanelImporterForTests();
  });

  it('imports the chunk once and shares the promise', async () => {
    const importer = vi.fn(async () => fakeModule);
    __setChatPanelImporterForTests(importer);

    const [first, second] = await Promise.all([loadChatPanel(), loadChatPanel()]);
    expect(first).toBe(fakeModule);
    expect(second).toBe(fakeModule);
    await loadChatPanel();
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed import so the next call requests the chunk again', async () => {
    const importer = vi
      .fn<() => Promise<PanelModule>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce(fakeModule);
    __setChatPanelImporterForTests(importer);

    await expect(loadChatPanel()).rejects.toThrow('Failed to fetch dynamically imported module');
    await expect(loadChatPanel()).resolves.toBe(fakeModule);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('loads the real panel module by default', async () => {
    const module = await loadChatPanel();
    expect(typeof module.default).toBe('function');
  });
});
