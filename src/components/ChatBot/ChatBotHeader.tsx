import React, { useId, useRef } from 'react';
import { RotateCcw, Minus, X, Bot } from 'lucide-react';
import { ChatBotHeaderProps } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ChatBotHeader: React.FC<ChatBotHeaderProps> = ({
  titleId,
  onClose,
  onMinimize,
  onResetClick,
  isMinimized,
  showResetConfirmation,
  onResetConfirm,
  onResetCancel
}) => {
  const generatedId = useId();
  const resetConfirmationId = `${generatedId}-reset-confirmation`;
  const resetConfirmationTitleId = `${generatedId}-reset-confirmation-title`;
  const resetConfirmationDescriptionId = `${generatedId}-reset-confirmation-description`;
  const resetConfirmationRef = useRef<HTMLDivElement>(null);

  const handleResetControlBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (
      !showResetConfirmation ||
      (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement))
    ) {
      return;
    }

    window.requestAnimationFrame(onResetCancel);
  };

  return (
    <div className="relative z-30 flex items-center justify-between gap-3 rounded-t-xl border-b border-border/70 bg-card/80 px-3.5 py-2.5 text-card-foreground backdrop-blur supports-[backdrop-filter]:bg-card/65 contrast-more:border-foreground/60 max-md:px-3 max-md:py-2">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm shadow-primary/10 contrast-more:border-primary/70">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 id={titleId} className="text-sm font-semibold text-foreground">Portfolio Assistant</h3>
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)] animate-pulse motion-reduce:animate-none contrast-more:ring-1 contrast-more:ring-primary"
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative" onBlur={handleResetControlBlur}>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/60 contrast-more:border contrast-more:border-transparent contrast-more:focus-visible:border-ring"
            onClick={onResetClick}
            title="Reset conversation"
            aria-label="Reset conversation"
            aria-haspopup="true"
            aria-expanded={showResetConfirmation}
            aria-controls={showResetConfirmation ? resetConfirmationId : undefined}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>

          {showResetConfirmation && (
            <div
              id={resetConfirmationId}
              ref={resetConfirmationRef}
              role="group"
              aria-labelledby={resetConfirmationTitleId}
              aria-describedby={resetConfirmationDescriptionId}
              className={cn(
                'absolute right-0 top-full z-[100] mt-2 w-64 max-w-[calc(100vw-2rem)]',
                'rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg',
                'animate-in fade-in slide-in-from-top-1 duration-100 motion-reduce:animate-none motion-reduce:transition-none contrast-more:border-foreground/70',
              )}
              onMouseDown={(event) => event.preventDefault()}
            >
              <p id={resetConfirmationTitleId} className="mb-1 text-xs font-semibold text-foreground">
                Reset active conversation?
              </p>
              <div id={resetConfirmationDescriptionId} className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
                Are you sure you want to reset the conversation? This will clear all messages and start fresh.
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  className="hover:bg-accent hover:text-accent-foreground"
                  onClick={onResetCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={onResetConfirm}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/60 contrast-more:border contrast-more:border-transparent contrast-more:focus-visible:border-ring"
          onClick={onMinimize}
          title={isMinimized ? "Expand" : "Minimize"}
          aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30 contrast-more:border contrast-more:border-transparent contrast-more:focus-visible:border-destructive"
          onClick={onClose}
          title="Close"
          aria-label="Close chat"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default ChatBotHeader;
