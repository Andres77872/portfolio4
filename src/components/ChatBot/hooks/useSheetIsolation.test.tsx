import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetIsolation } from './useSheetIsolation';

describe('useSheetIsolation', () => {
  let page: HTMLDivElement;
  let skip: HTMLAnchorElement;
  let header: HTMLElement;
  let main: HTMLElement;
  let alreadyInert: HTMLElement;
  let chatRoot: HTMLDivElement;
  let bodySibling: HTMLDivElement;

  beforeEach(() => {
    page = document.createElement('div');
    skip = document.createElement('a');
    header = document.createElement('header');
    main = document.createElement('main');
    alreadyInert = document.createElement('aside');
    alreadyInert.setAttribute('inert', '');
    chatRoot = document.createElement('div');
    chatRoot.append(document.createElement('div'));
    page.append(skip, header, main, alreadyInert, chatRoot);
    bodySibling = document.createElement('div');
    document.body.append(page, bodySibling);
    document.documentElement.style.overflow = 'clip';
  });

  afterEach(() => {
    page.remove();
    bodySibling.remove();
    document.documentElement.style.overflow = '';
  });

  it('makes every sibling up to <body> inert and locks page scroll while active', () => {
    const rootRef = { current: chatRoot };
    const { rerender } = renderHook(({ active }) => useSheetIsolation(rootRef, active), {
      initialProps: { active: true },
    });

    for (const element of [skip, header, main, bodySibling]) expect(element).toHaveAttribute('inert');
    expect(chatRoot).not.toHaveAttribute('inert');
    expect(page).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender({ active: false });

    for (const element of [skip, header, main, bodySibling]) expect(element).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('clip');
  });

  it('leaves elements that were already inert as they were', () => {
    const rootRef = { current: chatRoot };
    const { unmount } = renderHook(() => useSheetIsolation(rootRef, true));
    unmount();
    expect(alreadyInert).toHaveAttribute('inert');
  });

  it('does not touch portals added after activation', () => {
    const rootRef = { current: chatRoot };
    renderHook(() => useSheetIsolation(rootRef, true));

    const portal = document.createElement('div');
    document.body.append(portal);
    expect(portal).not.toHaveAttribute('inert');
    portal.remove();
  });

  it('leaves an already open project modal usable', () => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-slot', 'dialog-overlay');
    const modal = document.createElement('div');
    modal.setAttribute('data-slot', 'dialog-content');
    document.body.append(overlay, modal);
    const rootRef = { current: chatRoot };
    renderHook(() => useSheetIsolation(rootRef, true));

    expect(overlay).not.toHaveAttribute('inert');
    expect(modal).not.toHaveAttribute('inert');
    expect(bodySibling).toHaveAttribute('inert');
    overlay.remove();
    modal.remove();
  });

  it('does nothing while inactive', () => {
    const rootRef = { current: chatRoot };
    renderHook(() => useSheetIsolation(rootRef, false));
    expect(main).not.toHaveAttribute('inert');
    expect(document.documentElement.style.overflow).toBe('clip');
  });
});
