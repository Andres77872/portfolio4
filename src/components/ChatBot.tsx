import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { streamChatCompletion } from '../services/chatService';
import ReactMarkdown from "react-markdown";
import aboutData from '../data/about.json';
import projectsData from '../data/projects.json';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SuggestedQuery {
  text: string;
  icon?: string;
  category: 'general' | 'projects' | 'skills' | 'contact';
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 400, height: 550 });
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const suggestedQueries: SuggestedQuery[] = [
    { text: "What AI technologies does Andres specialize in?", icon: "🤖", category: 'skills' },
    { text: "Tell me about the FindIT project", icon: "🔍", category: 'projects' },
    { text: "Explain Novus Talk and magic-agents", icon: "🕸️", category: 'projects' },
    { text: "How can I contact Andres?", icon: "📧", category: 'contact' },
    { text: "What makes this portfolio unique?", icon: "✨", category: 'general' },
    { text: "Show me projects using LLMs", icon: "🧠", category: 'projects' }
  ];

  // Create system context with portfolio information
  const getSystemContext = (): Message => {
    const about = aboutData?.[0];
    const skills = about?.skills?.map(skill => `${skill.category}: ${skill.items.join(', ')}`).join('\n') || '';
    const projectSummary = projectsData.map(project => 
      `- ${project.title}: ${project.description} (${project.tags?.join(', ')})`
    ).join('\n');

    return {
      role: 'system',
      content: `You are an AI assistant for Andres Arizmendi's portfolio website. You help visitors learn about his work, projects, and expertise in AI development.

ABOUT ANDRES:
- AI Developer specializing in Generative AI and Large Language Models (LLMs)
- Expertise in autonomous agent systems, neural embeddings, and diffusion models
- Full-stack developer with FastAPI backends and React frontends

TECHNICAL SKILLS:
${skills}

FEATURED PROJECTS:
${projectSummary}

CONTACT INFORMATION:
- Email: andres@arz.ai
- LinkedIn: https://linkedin.com/in/jose-andres-arizmendi-sanchez-81b086217
- GitHub: https://github.com/Andres77872

INSTRUCTIONS:
1. Be helpful, knowledgeable, and enthusiastic about Andres's work
2. For project questions, provide specific details from the project descriptions
3. Help users navigate the portfolio by suggesting relevant sections
4. If asked about technical details, reference the actual technologies used
5. For contact requests, provide the appropriate contact information
6. Keep responses concise but informative
7. Use emojis appropriately to make responses engaging
8. If you don't know something specific, acknowledge it and suggest where to find more information

Remember: You're representing Andres's professional portfolio, so maintain a professional yet approachable tone.`
    };
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input field when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, isMinimized]);

  const toggleChatbot = () => {
    if (isOpen && !isMinimized) {
      setIsMinimized(true);
    } else if (isOpen && isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const closeChatbot = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleReset = () => {
    setMessages([]);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSuggestedQuery = (query: string) => {
    setInput(query);
    setTimeout(() => {
      handleSubmit(new Event('submit') as unknown as FormEvent);
    }, 100);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Auto-minimize chatbot when navigating
      setIsMinimized(true);
    }
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
      // Include system context with each request
      const systemContext = getSystemContext();
      const messagesWithContext = [systemContext, ...messages, userMessage];

      // Call the OpenAI-compatible API with streaming
      const stream = await streamChatCompletion({
        messages: messagesWithContext,
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
        { 
          role: 'assistant', 
          content: `I apologize, but I'm experiencing some technical difficulties right now. However, I can still help you navigate the portfolio! 

Try these options:
- **Projects**: Scroll down to see Andres's AI projects like FindIT, Novus Talk, and magic-llm
- **About**: Learn more about his AI expertise and technical skills  
- **Contact**: Get in touch at andres@arz.ai

You can also explore the portfolio sections directly by clicking the navigation menu. Is there anything specific you'd like to know about Andres's work?` 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine chat window class based on state
  const chatWindowClass = isOpen 
    ? isMinimized 
      ? "chatbot__window chatbot__window--minimized" 
      : "chatbot__window chatbot__window--open"
    : "chatbot__window";

  return (
    <div className="chatbot" aria-live="polite">
      <button
        className={`chatbot__toggle ${isOpen ? 'chatbot__toggle--active' : ''}`}
        onClick={toggleChatbot}
        aria-label={!isOpen ? 'Open portfolio assistant' : (isMinimized ? 'Expand portfolio assistant' : 'Minimize portfolio assistant')}
        aria-expanded={isOpen && !isMinimized}
      >
        <span className="chatbot__toggle-icon">
          {!isOpen ? '🤖' : (isMinimized ? '💬' : '—')}
        </span>
        {isMinimized && <span className="chatbot__minimized-indicator">Portfolio Assistant</span>}
      </button>

      {isOpen && (
        <div
          className={chatWindowClass}
          style={!isMinimized ? { width: dimensions.width, height: dimensions.height } : undefined}
          aria-hidden={isMinimized}
        >
          <div className="chatbot__header">
            <div className="chatbot__header-title">
              <div className="chatbot__status-indicator" aria-hidden="true"></div>
              <h3>Portfolio Assistant</h3>
            </div>
            <div className="chatbot__controls">
              <button
                type="button"
                className="chatbot__control-button"
                onClick={handleReset}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <span aria-hidden="true">🔄</span>
              </button>
              <button
                type="button"
                className="chatbot__control-button"
                onClick={toggleChatbot}
                title="Minimize"
                aria-label="Minimize chat"
              >
                <span aria-hidden="true">—</span>
              </button>
              <button
                type="button"
                className="chatbot__control-button"
                onClick={closeChatbot}
                title="Close"
                aria-label="Close chat"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              <div
                className="chatbot__resize-handle"
                title="Drag to resize"
                aria-label="Resize chat window"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const { width, height } = dimensions;
                  let resizing = true;
                  
                  // Add resizing class for styling
                  document.body.classList.add('chatbot-resizing');
                  
                  const onMouseMove = (ev: MouseEvent) => {
                    if (!resizing) return;
                    const deltaX = startX - ev.clientX;
                    const deltaY = startY - ev.clientY;
                    setDimensions({
                      width: Math.max(350, width + deltaX),
                      height: Math.max(400, height + deltaY),
                    });
                  };
                  
                  const onMouseUp = () => {
                    resizing = false;
                    document.body.classList.remove('chatbot-resizing');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              />
              
              <div className="chatbot__messages" role="log" aria-live="polite" aria-label="Conversation">
                {messages.length === 0 ? (
                  <div className="chatbot__welcome">
                    <div className="chatbot__welcome-icon" aria-hidden="true">🤖</div>
                    <h4>Hi! I'm Andres's Portfolio Assistant</h4>
                    <p>I can help you explore Andres's AI projects, technical expertise, and answer questions about his work in machine learning and software development.</p>
                    
                    <div className="chatbot__suggested-queries">
                      {suggestedQueries.map((query, index) => (
                        <button 
                          key={index}
                          className={`chatbot__suggested-query chatbot__suggested-query--${query.category}`}
                          onClick={() => handleSuggestedQuery(query.text)}
                          aria-label={`Ask: ${query.text}`}
                        >
                          {query.icon && <span className="chatbot__suggested-query-icon">{query.icon}</span>}
                          <span>{query.text}</span>
                        </button>
                      ))}
                    </div>

                    <div className="chatbot__navigation-hint">
                      <p><strong>Quick Navigation:</strong></p>
                      <div className="chatbot__nav-buttons">
                        <button onClick={() => scrollToSection('about')} className="chatbot__nav-button">About</button>
                        <button onClick={() => scrollToSection('projects')} className="chatbot__nav-button">Projects</button>
                        <button onClick={() => scrollToSection('contact')} className="chatbot__nav-button">Contact</button>
                      </div>
                    </div>
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
                      <div className="chatbot__message-avatar" aria-hidden="true">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="chatbot__message-content">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="chatbot__message chatbot__message--assistant">
                    <div className="chatbot__message-avatar" aria-hidden="true">
                      🤖
                    </div>
                    <div className="chatbot__message-content">
                      <div className="chatbot__typing" aria-label="Assistant is typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form className="chatbot__input" onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  className="chatbot__input-field"
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about Andres's AI projects..."
                  disabled={isLoading}
                  aria-label="Type your message"
                />
                <button
                  className="chatbot__input-button"
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                >
                  <span className="chatbot__send-icon" aria-hidden="true">
                    {isLoading ? '⏳' : '➤'}
                  </span>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
