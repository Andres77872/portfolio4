import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { streamChatCompletion } from '../services/chatService';
import ReactMarkdown from "react-markdown";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatBot() {
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
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
    <div className="chatbot">
      <button
        className="chatbot__toggle"
        onClick={toggleChatbot}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
      >
        <span>{isOpen ? '✕' : '💬'}</span>
      </button>

      {isOpen && (
        <div className="chatbot__window">
          <div className="chatbot__header">
            <h3>AI Assistant</h3>
          </div>
          <div className="chatbot__messages">
            {messages.length === 0 ? (
              <div className="chatbot__welcome">
                <p>Hello! How can I help you today?</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`chatbot__message ${
                    message.role === 'user'
                      ? 'chatbot__message--user'
                      : 'chatbot__message--assistant'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ))
            )}
            {isLoading && (
              <div className="chatbot__message chatbot__message--assistant">
                <div className="chatbot__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot__input" onSubmit={handleSubmit}>
            <input
              className="chatbot__input-field"
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button
              className="chatbot__input-button"
              type="submit"
              disabled={isLoading || !input.trim()}
            >
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
