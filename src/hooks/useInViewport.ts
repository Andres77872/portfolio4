import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the element currently intersects the viewport. Animation loops use it to
 * stop spending frames on a canvas nobody can see. Defaults to true where
 * IntersectionObserver is unavailable, so nothing silently freezes.
 */
export function useInViewport(ref: RefObject<Element | null>, rootMargin = '0px'): boolean {
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setInViewport(entry.isIntersecting);
    }, { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inViewport;
}
