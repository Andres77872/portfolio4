import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatBotMessagesProps, Message } from './types';
import '../../css/components/chatbot/ChatBotMessages.css';

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
      <div className="cb-messages__image-error" role="img" aria-label={alt || 'Image failed to load'}>
        🖼️ Image unavailable
      </div>
    );
  }
  
  return (
    <div className={`cb-messages__image-container ${className}`}>
      {isLoading && (
        <div className="cb-messages__image-loading" aria-label="Loading image">
          ⏳ Loading...
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`cb-messages__image ${isLoading ? 'cb-messages__image--loading' : ''}`}
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
  markdownComponents: Record<string, any>;
}> = React.memo(({ message, markdownComponents }) => (
  <div
    className={`cb-messages__message ${
      message.role === 'user'
        ? 'cb-messages__message--user'
        : 'cb-messages__message--assistant'
    }`}
  >
    <div className="cb-messages__message-avatar" aria-hidden="true">
      {message.role === 'user' ? '👤' : '🤖'}
    </div>
    <div className="cb-messages__message-content">
      <ReactMarkdown components={markdownComponents}>
        {message.content}
      </ReactMarkdown>
    </div>
  </div>
));

MessageItem.displayName = 'MessageItem';

const ChatBotMessages: React.FC<ChatBotMessagesProps> = ({
  messages,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageLength = useRef<number>(0);

  // Optimized auto-scroll: only scroll when message count changes or loading state changes
  // Not on every content update during streaming
  useEffect(() => {
    const shouldScroll = 
      messages.length !== lastMessageLength.current || // New message added
      isLoading; // Loading state changed
    
    if (shouldScroll) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      lastMessageLength.current = messages.length;
    }
  }, [messages.length, isLoading]); // Only depend on length and loading, not full messages array

  // Memoize ReactMarkdown components configuration to prevent recreation on every render
  const markdownComponents = useMemo(() => ({
    // Custom rendering for better styling
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="cb-messages__message-paragraph">{children}</p>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="cb-messages__message-strong">{children}</strong>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="cb-messages__message-em">{children}</em>
    ),
    code: ({ children }: { children: React.ReactNode }) => (
      <code className="cb-messages__message-code">{children}</code>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="cb-messages__message-pre">{children}</pre>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="cb-messages__message-list">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="cb-messages__message-list cb-messages__message-list--ordered">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="cb-messages__message-list-item">{children}</li>
    ),
    // Optimized image component with proper caching
    img: ({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: any }) => (
      <OptimizedImage 
        src={src || ''} 
        alt={alt || ''} 
        className="cb-messages__message-image"
        {...props}
      />
    ),
    // Handle links that might be images
    a: ({ href, children, ...props }: { href?: string; children: React.ReactNode; [key: string]: any }) => {
      const isImageLink = href && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(href);
      if (isImageLink) {
        return (
          <OptimizedImage 
            src={href} 
            alt={typeof children === 'string' ? children : 'Linked image'} 
            className="cb-messages__message-linked-image"
          />
        );
      }
      return (
        <a 
          href={href} 
          className="cb-messages__message-link" 
          target="_blank" 
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
  }), []);

  // Generate stable keys for messages using timestamp and content hash
  const generateMessageKey = useCallback((message: Message, index: number): string => {
    if (message.timestamp) {
      return `${message.timestamp.getTime()}-${message.role}-${index}`;
    }
    // Fallback to content-based key for messages without timestamp
    const contentHash = message.content.length + message.role + index;
    return `${contentHash}-${index}`;
  }, []);

  return (
    <div className="cb-messages" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((message, index) => (
        <MessageItem
          key={generateMessageKey(message, index)}
          message={message}
          markdownComponents={markdownComponents}
        />
      ))}
      
      {isLoading && (
        <div className="cb-messages__message cb-messages__message--assistant">
          <div className="cb-messages__message-avatar" aria-hidden="true">
            🤖
          </div>
          <div className="cb-messages__message-content">
            <div className="cb-messages__typing" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default React.memo(ChatBotMessages); 