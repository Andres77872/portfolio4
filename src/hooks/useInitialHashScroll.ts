import { useEffect } from 'react';

/**
 * The browser tries to honor `#section` links before React has rendered the sections,
 * so a shared link like `/#about` would otherwise stay at the top. Re-apply it once
 * after the first commit — instantly, since animating through the page on load is noise.
 */
export function useInitialHashScroll(): void {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const timeout = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
}

export default useInitialHashScroll;
