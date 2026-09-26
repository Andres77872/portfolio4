// Kept free of imports so the test setup can reset the counter without loading the catalog.

let idCounter = 0;

/** Turn ids: a counter plus a base-36 timestamp, unique within the page. */
export function createId(prefix: 'u' | 'a'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function __resetIdsForTests(): void {
  idCounter = 0;
}
