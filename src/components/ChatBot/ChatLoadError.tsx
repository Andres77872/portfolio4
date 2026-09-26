import { useEffect, useRef, type RefObject } from 'react';
import { RotateCcw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getContactLink } from '@/data/profile';
import { cn } from '@/lib/utils';

import { useAnnounce } from './chatAnnouncerContext';
import ChatDisclosure from './ChatDisclosure';
import ChatPanelTitle from './ChatPanelTitle';
import { isPanelEscapeTarget, useChatEscape } from './hooks/useChatEscape';
import { focusRing, headerIconButton, panelHeader, panelTextButton } from './styles';

export interface ChatLoadErrorProps {
  open: boolean;
  frameRef: RefObject<HTMLElement>;
  onRetry(): void;
  onClose(): void;
}

/** Error boundary fallback inside the frame: the site stays mounted and the chunk can be requested again. */
export default function ChatLoadError({ open, frameRef, onRetry, onClose }: ChatLoadErrorProps) {
  const email = getContactLink('Email')?.url;
  const announce = useAnnounce();
  const retryRef = useRef<HTMLButtonElement>(null);

  // Replaces the loading skeleton (or a failed retry's focused button): say so, and give focus a
  // home unless the visitor already moved it somewhere else on purpose. Runs once per mount; a new
  // failure remounts this fallback.
  useEffect(() => {
    announce("The assistant couldn't load.");
    const active = document.activeElement;
    if (open && (!active || active === document.body || active === frameRef.current)) {
      retryRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useChatEscape(frameRef, open, (event) => {
    if (!isPanelEscapeTarget(event.target, frameRef.current)) return;
    event.preventDefault();
    onClose();
  });

  return (
    <>
      <div className={panelHeader}>
        <ChatPanelTitle />
        <Button
          type="button"
          variant="ghost"
          aria-label="Close assistant"
          onClick={onClose}
          className={cn(headerIconButton, focusRing)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-3 px-4 group-data-[short]/panel:h-40 group-data-[short]/panel:flex-none">
        <p className="text-sm font-medium text-foreground">The assistant couldn&apos;t load.</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            ref={retryRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className={cn(panelTextButton, focusRing)}
          >
            <RotateCcw />
            Try again
          </Button>
          {email && (
            <Button asChild variant="ghost" size="sm" className={cn(panelTextButton, focusRing)}>
              <a href={email}>Email Andres</a>
            </Button>
          )}
        </div>
      </div>
      <ChatDisclosure />
    </>
  );
}
