// jsdom gaps the chat UI relies on. Installed by setup.ts; tests may import the helpers.

/** ResizeObserver that never fires on its own; call `triggerResize` to deliver entries. */
export class MockResizeObserver implements ResizeObserver {
  static readonly instances = new Set<MockResizeObserver>();

  readonly targets = new Set<Element>();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    this.targets.add(target);
    MockResizeObserver.instances.add(this);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    MockResizeObserver.instances.delete(this);
  }

  trigger(targets: Iterable<Element> = this.targets): void {
    const entries = Array.from(targets, (target) => ({
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    })) as unknown as ResizeObserverEntry[];
    if (entries.length > 0) this.callback(entries, this);
  }
}

/** Delivers a resize entry to every observer watching `target` (or every observed element). */
export function triggerResize(target?: Element): void {
  for (const observer of Array.from(MockResizeObserver.instances)) {
    if (!target) observer.trigger();
    else if (observer.targets.has(target)) observer.trigger([target]);
  }
}

export function installDomStubs(): void {
  globalThis.ResizeObserver = MockResizeObserver;

  const noop = () => undefined;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  if (typeof Element.prototype.scrollTo !== 'function') Element.prototype.scrollTo = noop;
  // jsdom's window.scrollTo only logs "not implemented".
  window.scrollTo = noop;
}

/**
 * jsdom lays nothing out, so `getClientRects()` is always empty. This makes every element
 * report one rect unless it (or an ancestor) is `hidden`, which is what the chat's
 * "is it rendered?" checks need. Returns a restore function.
 */
export function stubClientRects(): () => void {
  const original = Element.prototype.getClientRects;
  Element.prototype.getClientRects = function getClientRects(this: Element) {
    const rects = this.closest('[hidden]') ? [] : [this.getBoundingClientRect()];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null }) as unknown as DOMRectList;
  };
  return () => {
    Element.prototype.getClientRects = original;
  };
}
