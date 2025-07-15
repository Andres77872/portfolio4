import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatBotMessagesProps } from './types';
import '../../css/components/chatbot/ChatBotMessages.css';

const ChatBotMessages: React.FC<ChatBotMessagesProps> = ({
  messages,
  isLoading,
  hasMessages,
  onBackToStart
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="cb-messages" role="log" aria-live="polite" aria-label="Conversation">
      {messages.map((message, index) => (
        <div
          key={index}
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
            <ReactMarkdown
              components={{
                // Custom rendering for better styling
                p: ({ children }) => <p className="cb-messages__message-paragraph">{children}</p>,
                strong: ({ children }) => <strong className="cb-messages__message-strong">{children}</strong>,
                em: ({ children }) => <em className="cb-messages__message-em">{children}</em>,
                code: ({ children }) => <code className="cb-messages__message-code">{children}</code>,
                pre: ({ children }) => <pre className="cb-messages__message-pre">{children}</pre>,
                ul: ({ children }) => <ul className="cb-messages__message-list">{children}</ul>,
                ol: ({ children }) => <ol className="cb-messages__message-list cb-messages__message-list--ordered">{children}</ol>,
                li: ({ children }) => <li className="cb-messages__message-list-item">{children}</li>
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
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
      
      {hasMessages && (
        <button
          className="cb-messages__back-to-start"
          onClick={onBackToStart}
          title="Back to start"
          aria-label="Go back to welcome screen"
        >
          <span className="cb-messages__back-to-start-icon">←</span>
          Back to start
        </button>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatBotMessages; 