import { afterEach, describe, expect, it, vi } from 'vitest';

import { SHOW_WORK_EVENT, showWork } from './projectLink';

describe('showWork', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
  });

  it('replaces the filters, clears the open project and scrolls to Work', () => {
    document.body.innerHTML = '<section id="projects"></section>';
    const section = document.getElementById('projects') as HTMLElement;
    const scrollIntoView = vi.spyOn(section, 'scrollIntoView');
    window.history.replaceState({ projectModal: true }, '', '/?project=findit&stack=PYTHON');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');

    showWork({ category: 'agents-llm' });

    expect(replaceState).toHaveBeenCalledTimes(1);
    const [state, , url] = replaceState.mock.calls[0];
    expect(state).toBeNull();
    expect(new URL(String(url)).search).toBe('?category=agents-llm');
    expect(pushState).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('applies a stack filter', () => {
    showWork({ stack: 'QDRANT' });

    expect(window.location.search).toBe('?stack=QDRANT');
  });

  it('tells Projects to drop its free-text search', () => {
    const listener = vi.fn();
    window.addEventListener(SHOW_WORK_EVENT, listener);

    showWork({ category: 'agents-llm' });

    window.removeEventListener(SHOW_WORK_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
