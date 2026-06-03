import React, { useRef, useEffect, useMemo, useCallback, useLayoutEffect, useState } from 'react';
import type { ComponentProps, ElementType } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ExtraProps } from 'react-markdown';
import { AlertCircle, ImageOff, Loader2, RotateCcw } from 'lucide-react';
import { ChatBotMessagesProps, Message } from './types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import ChatAvatar from './ChatAvatar';
import TypingIndicator from './TypingIndicator';

type MarkdownComponents = {
  [Key in Extract<ElementType, string>]?: ElementType<ComponentProps<Key> & ExtraProps>;
};

// Optimized image component with proper caching and loading states
const OptimizedImage: React.FC<{ src: string; alt?: string; className?: string }> = React.memo(({
  src,
  alt = '',
  className = ''
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Reset loading state when src changes
  React.useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div
        className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
        role="img"
        aria-label={alt || 'Image failed to load'}
      >
        <ImageOff className="h-4 w-4" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-md', className)}>
      {isLoading && (
        <div
          className="flex items-center justify-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
          aria-label="Loading image"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn('max-w-full rounded-md', isLoading && 'hidden')}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Memoized message component to prevent unnecessary re-renders
const MessageItem: React.FC<{
  message: Message;
  markdownComponents: MarkdownComponents;
  onRetryLastFailed?: () => void;
}> = React.memo(({ message, markdownComponents, onRetryLastFailed }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const hasContent = message.content.trim().length > 0;

  return (
    <div
      className={cn(
        'flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200',
        isUser ? 'flex-row-reverse self-end' : 'self-start'
      )}
    >
      <ChatAvatar role={message.role} size="sm" />
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed max-md:max-w-[90%]',
          // Markdown children styles
          '[&_p]:my-0.5 [&_strong]:font-semibold [&_em]:italic',
          '[&_code]:rounded-sm [&_code]:bg-foreground/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
          '[&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2.5',
          '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4',
          '[&_li]:my-0.5',
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80',
          '[&_img]:my-1.5 [&_img]:max-w-full [&_img]:rounded-md',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground shadow-sm whitespace-pre-wrap'
            : 'rounded-bl-md border border-border bg-card text-foreground shadow-sm',
          isError && 'border-destructive/50 bg-destructive/10 text-foreground'
        )}
      >
        {hasContent && (
          <ReactMarkdown components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}

        {isError && (
          <div className={cn('flex flex-col gap-2', hasContent && 'mt-2 border-t border-destructive/20 pt-2')}>
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Assistant response interrupted</p>
                <p className="text-xs text-muted-foreground">
                  {message.errorMessage || 'Something went wrong while generating this response.'}
                </p>
              </div>
            </div>

            {message.retryForMessageId && onRetryLastFailed && (
              <button
                type="button"
                onClick={onRetryLastFailed}
                className="inline-flex w-fit items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Retry last failed assistant response"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

const ChatBotMessages: React.FC<ChatBotMessagesProps> = ({
  messages,
  isStreaming,
  onRetryLastFailed
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const getViewport = useCallback(() => {
    if (viewportRef.current) {
      return viewportRef.current;
    }

    viewportRef.current = scrollAreaRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null;
    return viewportRef.current;
  }, []);

  const isNearBottom = useCallback((viewport: HTMLElement) => {
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    return distanceFromBottom <= 64;
  }, []);

  const scrollViewportToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const viewport = getViewport();
    if (!viewport) {
      return;
    }

    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    shouldStickToBottomRef.current = true;
    setHasNewMessages(false);
  }, [getViewport]);

  // Memoize ReactMarkdown components configuration to prevent recreation on every render
  const markdownComponents = useMemo<MarkdownComponents>(() => ({
    img: ({ src, alt }) => (
      <OptimizedImage src={src || ''} alt={alt || ''} />
    ),
    a: ({ href, children, node, ...props }) => {
      void node;
      const isImageLink = href && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(href);
      if (isImageLink) {
        return <OptimizedImage src={href} alt={typeof children === 'string' ? children : 'Linked image'} />;
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }
  }), []);

  // Generate stable keys for messages using timestamp and content hash
  const generateMessageKey = useCallback((message: Message, index: number): string => {
    if (message.id) {
      return message.id;
    }

    if (message.timestamp) {
      return `${message.timestamp.getTime()}-${message.role}-${index}`;
    }
    const contentHash = message.content.length + message.role + index;
    return `${contentHash}-${index}`;
  }, []);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !(message.role === 'assistant' && message.status === 'streaming' && message.content.trim().length === 0)),
    [messages]
  );

  const hasVisibleStreamingAssistant = visibleMessages.some(
    (message) => message.role === 'assistant' && message.status === 'streaming'
  );

  const showTypingIndicator = isStreaming && !hasVisibleStreamingAssistant;

  const scrollSignature = useMemo(
    () => [
      ...visibleMessages.map((message) => `${message.id ?? message.timestamp?.getTime() ?? ''}:${message.status ?? ''}:${message.content.length}`),
      showTypingIndicator ? 'typing' : 'idle'
    ].join('|'),
    [visibleMessages, showTypingIndicator]
  );

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      const nearBottom = isNearBottom(viewport);
      shouldStickToBottomRef.current = nearBottom;

      if (nearBottom) {
        setHasNewMessages(false);
      }
    };

    handleScroll();
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [getViewport, isNearBottom]);

  useLayoutEffect(() => {
    const viewport = getViewport();
    if (!viewport) {
      return;
    }

    if (shouldStickToBottomRef.current) {
      scrollViewportToBottom(isStreaming ? 'auto' : 'smooth');
      return;
    }

    setHasNewMessages(true);
  }, [scrollSignature, isStreaming, getViewport, scrollViewportToBottom]);

  return (
    <div ref={scrollAreaRef} className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div
          className="flex flex-col gap-3 p-4 max-md:p-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Conversation with portfolio assistant"
        >
          {visibleMessages.map((message, index) => (
            <MessageItem
              key={generateMessageKey(message, index)}
              message={message}
              markdownComponents={markdownComponents}
              onRetryLastFailed={onRetryLastFailed}
            />
          ))}

          {showTypingIndicator && (
            <div className="flex gap-2.5 self-start animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
              <ChatAvatar role="assistant" size="sm" />
              <TypingIndicator className="rounded-xl rounded-bl-md border border-border bg-card px-3 py-2 shadow-sm" />
            </div>
          )}
        </div>
      </ScrollArea>

      {hasNewMessages && (
        <button
          type="button"
          onClick={() => scrollViewportToBottom('smooth')}
          className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Scroll to latest messages"
        >
          New messages
        </button>
      )}
    </div>
  );
};

export default React.memo(ChatBotMessages);
