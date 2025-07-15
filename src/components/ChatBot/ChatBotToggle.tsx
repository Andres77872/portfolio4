import React from 'react';
import { ChatBotToggleProps } from './types';
import '../../css/components/chatbot/ChatBotToggle.css';

const ChatBotToggle: React.FC<ChatBotToggleProps> = ({
  isOpen,
  isMinimized,
  showHeyAnimation,
  onClick
}) => {
  return (
    <button
      className={`cb-toggle ${isOpen ? 'cb-toggle--active' : ''} ${showHeyAnimation ? 'cb-toggle--hey' : ''}`}
      onClick={onClick}
      aria-label={
        !isOpen 
          ? 'Open portfolio assistant' 
          : (isMinimized ? 'Expand portfolio assistant' : 'Minimize portfolio assistant')
      }
      aria-expanded={isOpen && !isMinimized}
      aria-describedby={showHeyAnimation && !isOpen ? 'cb-hey-bubble' : undefined}
      type="button"
    >
      <span 
        className="cb-toggle__icon"
        aria-hidden="true"
        role="img"
        aria-label={!isOpen ? 'Robot' : (isMinimized ? 'Chat bubble' : 'Minimize')}
      >
        {!isOpen ? '🤖' : (isMinimized ? '💬' : '—')}
      </span>
      
      {isMinimized && (
        <span 
          className="cb-toggle__minimized-indicator"
          aria-label="Portfolio assistant is minimized"
        >
          Portfolio Assistant
        </span>
      )}
      
      {showHeyAnimation && !isOpen && (
        <div 
          className="cb-toggle__hey-bubble"
          id="cb-hey-bubble"
          role="tooltip"
          aria-live="polite"
        >
          <span>Hey! 👋</span>
          <div 
            className="cb-toggle__hey-bubble-arrow"
            aria-hidden="true"
          ></div>
        </div>
      )}
    </button>
  );
};

export default ChatBotToggle; 