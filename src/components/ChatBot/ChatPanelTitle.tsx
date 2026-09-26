import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { TITLE_ID } from './constants';
import { monoLabel } from './styles';

interface ChatPanelTitleProps {
  /** Status line above the title (decorative: the announcer speaks state changes). */
  eyebrow?: ReactNode;
  /** Visually hidden but still the dialog's name, e.g. while the New chat confirmation fills the header. */
  visuallyHidden?: boolean;
}

/**
 * The header's eyebrow and `h2#chat-title`, shared by the loaded header, the loading skeleton
 * and the load-error fallback. Both stay on one line, so a narrow header never overflows.
 */
export default function ChatPanelTitle({ eyebrow, visuallyHidden = false }: ChatPanelTitleProps) {
  return (
    <div className={cn('min-w-0', visuallyHidden && 'sr-only')}>
      <p aria-hidden className={cn(monoLabel, 'flex items-center gap-1.5 overflow-hidden whitespace-nowrap')}>
        {eyebrow ?? <span className="truncate">AI · Answers from this site</span>}
      </p>
      <h2 id={TITLE_ID} className="truncate text-sm font-semibold text-foreground">
        Portfolio assistant
      </h2>
    </div>
  );
}
