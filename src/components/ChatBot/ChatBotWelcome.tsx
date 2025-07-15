import React from 'react';
import { ChatBotWelcomeProps } from './types';
import '../../css/components/chatbot/ChatBotWelcome.css';

const ChatBotWelcome: React.FC<ChatBotWelcomeProps> = ({
  suggestedQueries,
  onSuggestedQuery,
  onScrollToSection
}) => {
  return (
    <div className="cb-welcome">
      <div className="cb-welcome__icon" aria-hidden="true">🤖</div>
      <h4 className="cb-welcome__title">Hi! I'm Andres's Portfolio Assistant</h4>
      <p className="cb-welcome__description">
        I can help you explore Andres's AI projects, technical expertise, and answer questions about his work in machine learning and software development.
      </p>
      
      <div className="cb-welcome__suggested-queries">
        {suggestedQueries.map((query, index) => (
          <button 
            key={index}
            className={`cb-welcome__suggested-query cb-welcome__suggested-query--${query.category}`}
            onClick={() => onSuggestedQuery(query.text)}
            aria-label={`Ask: ${query.text}`}
          >
            {query.icon && (
              <span className="cb-welcome__suggested-query-icon">
                {query.icon}
              </span>
            )}
            <span className="cb-welcome__suggested-query-text">
              {query.text}
            </span>
          </button>
        ))}
      </div>

      <div className="cb-welcome__navigation-hint">
        <p className="cb-welcome__navigation-title">
          <strong>Quick Navigation:</strong>
        </p>
        <div className="cb-welcome__nav-buttons">
          <button 
            onClick={() => onScrollToSection('about')} 
            className="cb-welcome__nav-button"
          >
            About
          </button>
          <button 
            onClick={() => onScrollToSection('projects')} 
            className="cb-welcome__nav-button"
          >
            Projects
          </button>
          <button 
            onClick={() => onScrollToSection('contact')} 
            className="cb-welcome__nav-button"
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBotWelcome; 