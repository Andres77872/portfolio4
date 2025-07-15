import React, { useRef, useEffect } from 'react';
import { ChatBotHeaderProps } from './types';
import '../../css/components/chatbot/ChatBotHeader.css';

const ChatBotHeader: React.FC<ChatBotHeaderProps> = ({
  onClose,
  onMinimize,
  onResetClick,
  isMinimized,
  showResetConfirmation,
  onResetConfirm,
  onResetCancel
}) => {
  const resetConfirmationRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside reset confirmation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resetConfirmationRef.current && !resetConfirmationRef.current.contains(event.target as Node)) {
        onResetCancel();
      }
    };

    if (showResetConfirmation) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResetConfirmation, onResetCancel]);

  return (
    <div className="cb-header">
      <div className="cb-header__title">
        <div className="cb-header__status-indicator" aria-hidden="true"></div>
        <h3>Portfolio Assistant</h3>
      </div>
      
      <div className="cb-header__controls">
        <div className="cb-header__control-group">
          <button
            type="button"
            className="cb-header__control-button cb-header__control-button--reset"
            onClick={onResetClick}
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <span aria-hidden="true">↻</span>
          </button>
          
          {showResetConfirmation && (
            <div ref={resetConfirmationRef} className="cb-header__reset-confirmation">
              <div className="cb-header__reset-confirmation-text">
                Are you sure you want to reset the conversation? This will clear all messages and start fresh.
              </div>
              <div className="cb-header__reset-confirmation-actions">
                <button
                  type="button"
                  className="cb-header__reset-cancel-btn"
                  onClick={onResetCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cb-header__reset-confirm-btn"
                  onClick={onResetConfirm}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button
          type="button"
          className="cb-header__control-button cb-header__control-button--minimize"
          onClick={onMinimize}
          title={isMinimized ? "Expand" : "Minimize"}
          aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
        >
          <span aria-hidden="true">{isMinimized ? '□' : '—'}</span>
        </button>
        
        <button
          type="button"
          className="cb-header__control-button cb-header__control-button--close"
          onClick={onClose}
          title="Close"
          aria-label="Close chat"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
};

export default ChatBotHeader; 