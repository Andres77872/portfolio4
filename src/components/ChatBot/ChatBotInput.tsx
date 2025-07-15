import React from 'react';
import { ChatBotInputProps } from './types';
import '../../css/components/chatbot/ChatBotInput.css';

const ChatBotInput: React.FC<ChatBotInputProps> = ({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  inputRef
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  return (
    <form className="cb-input" onSubmit={onSubmit}>
      <div className="cb-input__container">
        <input
          ref={inputRef}
          className="cb-input__field"
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Andres's AI projects..."
          disabled={isLoading}
          aria-label="Type your message"
          autoComplete="off"
        />
        <button
          className="cb-input__button"
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label={isLoading ? "Sending message..." : "Send message"}
        >
          <span className="cb-input__button-icon" aria-hidden="true">
            {isLoading ? '⏳' : '➤'}
          </span>
        </button>
      </div>
    </form>
  );
};

export default ChatBotInput; 