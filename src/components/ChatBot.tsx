import React, { useState, useRef, useEffect } from 'react';
import '../styles/ChatBot.css';
import { streamChatCompletion } from '../services/chatService';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the OpenAI-compatible API with streaming
      const stream = await streamChatCompletion({
        messages: [...messages, userMessage],
      });

      // Set up streaming
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update the last message (assistant's message)
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantMessage,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <button 
        className="chatbot-toggle-button"
        onClick={toggleChatbot}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>AI Assistant</h3>
          </div>
          <div className="chatbot-messages">
            {messages.length === 0 ? (
              <div className="chatbot-welcome">
                <p>Hello! How can I help you today?</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`chatbot-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                >
                  {message.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="chatbot-message assistant-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
