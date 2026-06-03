import React from 'react';
import { Bot, MessageSquare, Minus, Sparkles } from 'lucide-react';
import { ChatBotToggleProps } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ChatBotToggle: React.FC<ChatBotToggleProps> = ({
  isOpen,
  isMinimized,
  showPromptCue,
  onClick,
  rootRef
}) => {
  const triggerDescriptionId = 'portfolio-chatbot-trigger-description';
  const cueDescriptionId = 'portfolio-chatbot-cue-description';

  return (
    <div
      ref={rootRef}
      className="fixed bottom-6 right-6 z-50 max-md:bottom-4 max-md:right-4 max-xs:bottom-3 max-xs:right-3"
    >
      <p id={triggerDescriptionId} className="sr-only">
        Opens a floating, non-blocking portfolio assistant panel.
      </p>
      <p id={cueDescriptionId} className="sr-only">
        Portfolio assistant is available for questions about Andres&apos;s work.
      </p>

      <Button
        className={cn(
          'group relative size-[54px] overflow-visible rounded-full border border-border/70 shadow-lg',
          'bg-primary text-primary-foreground transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out',
          'hover:scale-[1.03] hover:border-primary/50 hover:shadow-[0_10px_32px_rgb(0_0_0/0.22),0_0_0_6px_hsl(var(--primary)/0.12)]',
          'active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'contrast-more:border-2 contrast-more:border-primary',
          'max-md:size-12 max-xs:size-[46px]',
          isOpen && !isMinimized && 'bg-muted text-foreground hover:bg-muted/90',
          isMinimized && 'bg-card text-foreground hover:bg-accent',
        )}
        size="icon"
        onClick={onClick}
        aria-label={
          !isOpen
            ? 'Open portfolio assistant'
            : (isMinimized ? 'Expand portfolio assistant' : 'Minimize portfolio assistant')
        }
        aria-expanded={isOpen && !isMinimized}
        aria-describedby={cn(triggerDescriptionId, showPromptCue && !isOpen && cueDescriptionId)}
        type="button"
      >
        {showPromptCue && !isOpen && (
          <span
            className={cn(
              'pointer-events-none absolute inset-[-7px] rounded-full border border-primary/30 bg-primary/10 opacity-80',
              'motion-safe:animate-pulse motion-reduce:animate-none',
              'contrast-more:border-2 contrast-more:border-primary/80'
            )}
            aria-hidden="true"
          />
        )}
        <span className="relative grid size-full place-items-center" aria-hidden="true">
          <Bot
            className={cn(
              'absolute h-5 w-5 stroke-[1.5] transition-opacity duration-150 ease-out motion-reduce:transition-none',
              !isOpen ? 'opacity-100' : 'opacity-0'
            )}
          />
          <MessageSquare
            className={cn(
              'absolute h-5 w-5 stroke-[1.5] transition-opacity duration-150 ease-out motion-reduce:transition-none',
              isMinimized ? 'opacity-100' : 'opacity-0'
            )}
          />
          <Minus
            className={cn(
              'absolute h-5 w-5 stroke-[2] transition-opacity duration-150 ease-out motion-reduce:transition-none',
              isOpen && !isMinimized ? 'opacity-100' : 'opacity-0'
            )}
          />
        </span>
        {showPromptCue && !isOpen && (
          <span
            className={cn(
              'pointer-events-none absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full',
              'border border-background bg-card text-primary shadow-sm',
              'transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
              'contrast-more:border-2 contrast-more:border-primary'
            )}
            aria-hidden="true"
          >
            <Sparkles className="h-2.5 w-2.5 stroke-[2]" />
          </span>
        )}
      </Button>

      {isMinimized && (
        <span
          className={cn(
            'absolute -top-8 right-0 whitespace-nowrap rounded-md',
            'bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-md border border-border',
            'animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none',
            'contrast-more:border-2'
          )}
          aria-hidden="true"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            Portfolio Assistant
          </span>
        </span>
      )}
    </div>
  );
};

export default ChatBotToggle;
