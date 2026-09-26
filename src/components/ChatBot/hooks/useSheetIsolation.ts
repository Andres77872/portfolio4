import { useEffect, type RefObject } from 'react';

// A project modal (z-210) or the Navbar sheet paints above the chat sheet; if one is already
// open when the sheet activates (a resize into the sheet layout), it must stay usable.
const RADIX_LAYER_SELECTOR =
  '[data-slot="dialog-overlay"],[data-slot="dialog-content"],[data-slot="sheet-overlay"],[data-slot="sheet-content"]';

/**
 * Modal semantics for the full-screen sheet without remounting it into a portal: every
 * sibling on the path from the chat root up to <body> becomes `inert` and the page stops
 * scrolling. Only elements this hook made inert are restored, and Radix layers (the project
 * modal), whether open already or added later, are left alone.
 */
export function useSheetIsolation(rootRef: RefObject<HTMLElement>, active: boolean): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;

    const inerted: Element[] = [];
    let node: Element = root;
    while (node !== document.body && node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling === node || sibling.hasAttribute('inert') || sibling.matches(RADIX_LAYER_SELECTOR)) continue;
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
      node = node.parentElement;
    }

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    return () => {
      for (const element of inerted) element.removeAttribute('inert');
      html.style.overflow = previousOverflow;
    };
  }, [active, rootRef]);
}

export default useSheetIsolation;
