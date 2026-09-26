export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly scrolls a section into view; sections carry `scroll-mt-*` to clear the fixed header. */
export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
}

/** Moves keyboard focus to a section's heading (Section.tsx sets `${id}-heading`), else the element. */
export function focusSection(id: string): void {
  const target = document.getElementById(`${id}-heading`) ?? document.getElementById(id);
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
