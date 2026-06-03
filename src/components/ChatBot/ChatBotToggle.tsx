import React from 'react';
import { Bot, MessageSquare, Minus } from 'lucide-react';
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
          'group relative size-[54px] overflow-visible rounded-full border border-border bg-card text-foreground shadow-md',
          'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-lg',
          'active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
          'contrast-more:border-2 contrast-more:border-primary',
          'max-md:size-12 max-xs:size-[46px]',
          isOpen && !isMinimized && 'bg-muted hover:bg-muted/90',
          isMinimized && 'bg-card hover:bg-accent',
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
      </Button>

      {isMinimized && (
        <span
          className={cn(
            'absolute -top-8 right-0 whitespace-nowrap rounded-md',
            'bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm border border-border',
            'animate-in fade-in duration-150 motion-reduce:animate-none',
            'contrast-more:border-2'
          )}
          aria-hidden="true"
        >
          Portfolio Assistant
        </span>
      )}
    </div>
  );
};

export default ChatBotToggle;
