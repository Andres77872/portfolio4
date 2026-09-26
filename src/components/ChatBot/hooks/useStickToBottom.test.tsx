import { act, fireEvent, render, within } from '@testing-library/react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { triggerResize } from '@/test/dom';
import { mockMatchMedia } from '@/test/media';

import { useStickToBottom, type StickToBottom } from './useStickToBottom';

const Harness = forwardRef<StickToBottom>(function Harness(_props, ref) {
  const regionRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const state = useStickToBottom(regionRef, listRef);
  useImperativeHandle(ref, () => state, [state]);
  return (
    <div ref={regionRef} data-testid="region">
      <ol ref={listRef} data-testid="list" />
    </div>
  );
});

/** Gives the region a scrollable size; jsdom stores scrollTop but lays nothing out. */
function setup() {
  const handle = { current: null as StickToBottom | null };
  const utils = render(<Harness ref={(value) => (handle.current = value)} />);
  const region = within(utils.container).getByTestId('region');
  const list = within(utils.container).getByTestId('list');
  let scrollHeight = 1000;
  Object.defineProperty(region, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(region, 'clientHeight', { configurable: true, get: () => 300 });

  return {
    region,
    list,
    get state() {
      return handle.current as StickToBottom;
    },
    grow(by: number) {
      scrollHeight += by;
      act(() => triggerResize(list));
    },
    scrollTo(top: number) {
      region.scrollTop = top;
      fireEvent.scroll(region);
    },
  };
}

describe('useStickToBottom', () => {
  it('pins the region to the newest content while stuck', () => {
    const view = setup();
    view.grow(200);
    expect(view.region.scrollTop).toBe(1200);
    expect(view.state.stuck).toBe(true);
    expect(view.state.showJump).toBe(false);
  });

  it('unsticks on an upward wheel, then offers "Jump to latest" instead of scrolling', () => {
    const view = setup();
    view.grow(0);
    view.scrollTo(700); // the programmatic scroll event is ignored

    fireEvent.wheel(view.region, { deltaY: -120 });
    expect(view.state.stuck).toBe(false);
    expect(view.state.showJump).toBe(false);

    view.scrollTo(400);
    view.grow(200);
    expect(view.region.scrollTop).toBe(400);
    expect(view.state.showJump).toBe(true);
  });

  it('stays pinned when the region itself shrinks while stuck (context bar, taller composer)', () => {
    const view = setup();
    view.grow(0);
    view.scrollTo(700); // the programmatic scroll event is ignored
    view.region.scrollTop = 588; // the region got 112 px shorter: the browser keeps scrollTop, so it drifts off the end

    act(() => triggerResize(view.region));
    expect(view.region.scrollTop).toBe(1000);
    expect(view.state.stuck).toBe(true);
    expect(view.state.showJump).toBe(false);
  });

  it('does not treat a region resize as new content while unstuck', () => {
    const view = setup();
    fireEvent.wheel(view.region, { deltaY: -50 });
    view.scrollTo(200);

    act(() => triggerResize(view.region));
    expect(view.region.scrollTop).toBe(200);
    expect(view.state.showJump).toBe(false);
  });

  it('ignores a downward wheel', () => {
    const view = setup();
    fireEvent.wheel(view.region, { deltaY: 120 });
    expect(view.state.stuck).toBe(true);
  });

  it('unsticks on PageUp, ArrowUp or Home in the region', () => {
    for (const key of ['PageUp', 'ArrowUp', 'Home']) {
      const view = setup();
      fireEvent.keyDown(view.region, { key });
      expect(view.state.stuck).toBe(false);
    }
  });

  it('unsticks when the visitor scrolls up without any wheel event (scrollbar drag)', () => {
    const view = setup();
    view.grow(0);
    view.scrollTo(700);
    view.scrollTo(300);
    expect(view.state.stuck).toBe(false);
  });

  it('sticks again within 16 px of the bottom', () => {
    const view = setup();
    fireEvent.keyDown(view.region, { key: 'PageUp' });
    view.scrollTo(200);
    expect(view.state.stuck).toBe(false);

    view.scrollTo(1000 - 300 - 10);
    expect(view.state.stuck).toBe(true);
  });

  it('forceStick() re-sticks and scrolls to the end', () => {
    const view = setup();
    fireEvent.wheel(view.region, { deltaY: -50 });
    view.grow(100);
    expect(view.state.showJump).toBe(true);

    act(() => view.state.forceStick());
    expect(view.state.stuck).toBe(true);
    expect(view.state.showJump).toBe(false);
    expect(view.region.scrollTop).toBe(1100);
  });

  it('jumpToLatest() scrolls instantly when the visitor prefers reduced motion', () => {
    mockMatchMedia({ reducedMotion: true });
    const view = setup();
    const scrollTo = vi.fn();
    view.region.scrollTo = scrollTo as typeof view.region.scrollTo;

    fireEvent.wheel(view.region, { deltaY: -50 });
    act(() => view.state.jumpToLatest());

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'auto' });
    expect(view.state.stuck).toBe(true);
  });

  it('jumpToLatest() scrolls smoothly otherwise', () => {
    const view = setup();
    const scrollTo = vi.fn();
    view.region.scrollTo = scrollTo as typeof view.region.scrollTo;

    act(() => view.state.jumpToLatest());
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
  });
});
