import { useEffect, useRef } from 'react';
import { Maximize2, Minimize2, SquarePen, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import ChatPanelTitle from './ChatPanelTitle';
import { StatusDot } from './ChatTurn';
import { focusRing, headerIconButton, panelHeader, panelTextButton } from './styles';

interface ChatHeaderProps {
  busy: boolean;
  hasItems: boolean;
  confirming: boolean;
  onConfirmStart(): void;
  onConfirmCancel(): void;
  onConfirmClear(): void;
  canExpand: boolean;
  expanded: boolean;
  onToggleExpanded(): void;
  onClose(): void;
}

const RESET_QUESTION_ID = 'chat-reset-q';

/** Title, an honest status line, and New chat (with an inline confirmation), Larger panel and Close. */
export default function ChatHeader({
  busy,
  hasItems,
  confirming,
  onConfirmStart,
  onConfirmCancel,
  onConfirmClear,
  canExpand,
  expanded,
  onToggleExpanded,
  onClose,
}: ChatHeaderProps) {
  const newChatRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(confirming);

  // Opening the confirmation focuses Cancel; closing it (Cancel or Escape) returns to New chat.
  // After Clear the conversation is empty, New chat is gone and the panel focuses the composer.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirmingRef.current) newChatRef.current?.focus();
    wasConfirmingRef.current = confirming;
  }, [confirming]);

  const iconButton = cn(headerIconButton, focusRing);

  return (
    <div className={panelHeader}>
      {/* While confirming, the question takes the title's place; the h2 stays as the dialog's name. */}
      <ChatPanelTitle
        visuallyHidden={confirming}
        eyebrow={
          busy ? (
            <>
              <StatusDot />
              <span className="truncate">Answering…</span>
            </>
          ) : undefined
        }
      />

      {confirming ? (
        <div role="group" aria-labelledby={RESET_QUESTION_ID} className="flex min-w-0 flex-1 items-center gap-2">
          <p id={RESET_QUESTION_ID} className="min-w-0 flex-1 text-sm text-foreground">
            Clear this conversation?
          </p>
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={onConfirmCancel}
            className={cn(panelTextButton, focusRing)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onConfirmClear}
            className={cn(panelTextButton, 'border-destructive/50 text-foreground hover:bg-destructive/10', focusRing)}
          >
            Clear
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {hasItems && (
            <Button
              ref={newChatRef}
              type="button"
              variant="ghost"
              aria-label="New chat"
              title="New chat"
              onClick={onConfirmStart}
              className={iconButton}
            >
              <SquarePen className="size-4" />
            </Button>
          )}
          {canExpand && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Larger panel"
              aria-pressed={expanded}
              title="Larger panel"
              onClick={onToggleExpanded}
              className={iconButton}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          )}
          <Button type="button" variant="ghost" aria-label="Close assistant" onClick={onClose} className={iconButton}>
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
