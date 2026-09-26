import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { __resetIdsForTests } from '@/components/ChatBot/ids';
import { __resetAssistantAvailabilityForTests } from '@/lib/assistant';

import { MockResizeObserver, installDomStubs } from './dom';
import { mockMatchMedia } from './media';

// Network guard: no test may reach a real endpoint. Files that need fetch stub it
// themselves (vi.stubGlobal). Assigned directly so vi.unstubAllGlobals() restores the guard.
globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  throw new Error(`Unexpected network request in tests: ${url}`);
}) as typeof fetch;

installDomStubs();
mockMatchMedia();

afterEach(() => {
  cleanup();
  __resetAssistantAvailabilityForTests();
  __resetIdsForTests();
  vi.unstubAllEnvs();
  MockResizeObserver.instances.clear();
  mockMatchMedia();
});
