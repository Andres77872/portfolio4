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
    <>
      <button
        className={`cb-toggle ${isOpen ? 'cb-toggle--active' : ''} ${showHeyAnimation ? 'cb-toggle--hey' : ''}`}
        onClick={onClick}
        aria-label={
          !isOpen 
            ? 'Open portfolio assistant' 
            : (isMinimized ? 'Expand portfolio assistant' : 'Minimize portfolio assistant')
        }
        aria-expanded={isOpen && !isMinimized}
      >
        <span className="cb-toggle__icon">
          {!isOpen ? '🤖' : (isMinimized ? '💬' : '—')}
        </span>
        
        {isMinimized && (
          <span className="cb-toggle__minimized-indicator">
            Portfolio Assistant
          </span>
        )}
        
        {showHeyAnimation && !isOpen && (
          <div className="cb-toggle__hey-bubble">
            <span>Hey! 👋</span>
            <div className="cb-toggle__hey-bubble-arrow"></div>
          </div>
        )}
      </button>
    </>
  );
};

export default ChatBotToggle; 