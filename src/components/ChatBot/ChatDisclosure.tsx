import type { ReactNode } from 'react';

import { DISCLOSURE_ID, DISCLOSURE_TEXT } from './constants';

/**
 * The panel's one persistent disclosure; the dialog and the composer both reference it.
 * The id sits on the text, not the row: the counter shares the row but has its own id,
 * so a description that lists both never reads the counter twice.
 */
export default function ChatDisclosure({ counter }: { counter?: ReactNode }) {
  return (
    <p className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-1.5 text-[0.6875rem] leading-snug text-muted-foreground contrast-more:text-foreground group-data-[layout=sheet]/panel:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <span id={DISCLOSURE_ID}>{DISCLOSURE_TEXT}</span>
      {counter}
    </p>
  );
}
