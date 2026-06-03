import React from 'react';
import { Bot } from 'lucide-react';
import { ChatBotWelcomeProps } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ChatBotWelcome: React.FC<ChatBotWelcomeProps> = ({
  suggestedQueries,
  onSuggestedQuery,
  onScrollToSection
}) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-3 overflow-y-auto px-4 py-6 max-md:min-h-[250px] max-md:px-3 max-md:py-4">
      {/* Avatar */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
        <Bot className="h-6 w-6 text-primary stroke-[1.5]" />
      </div>

      {/* Title */}
      <h4 className="text-base font-semibold text-foreground max-md:text-[0.9375rem]">
        Hi! I'm Andres's Portfolio Assistant
      </h4>

      {/* Description */}
      <p className="max-w-[320px] text-center text-sm leading-relaxed text-muted-foreground max-md:text-[0.8125rem]">
        I can help you explore Andres's AI projects, technical expertise, and answer questions about his work in machine learning and software development.
      </p>

      {/* Suggested Queries */}
      <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2">
        {suggestedQueries.map((query, index) => (
          <button
            key={index}
            className={cn(
              'rounded-lg border border-border bg-card px-3 py-2.5',
              'text-left text-sm leading-snug text-foreground shadow-sm shadow-foreground/5',
              'transition-colors duration-150 motion-reduce:transition-none',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'contrast-more:border-foreground/70 contrast-more:bg-card contrast-more:ring-1 contrast-more:ring-ring/40',
            )}
            onClick={() => onSuggestedQuery(query.text)}
            aria-label={`Ask: ${query.text}`}
          >
            {query.text}
          </button>
        ))}
      </div>

      {/* Quick Navigation */}
      <div className="mt-4 w-full max-w-[320px]">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Navigation
        </p>
        <div className="flex gap-2">
          {(['about', 'projects', 'contact'] as const).map((section) => (
            <Button
              key={section}
              variant="outline"
              size="xs"
              className="capitalize flex-1"
              onClick={() => onScrollToSection(section)}
            >
              {section}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatBotWelcome;
