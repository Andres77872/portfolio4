import React, { useState, useRef, useEffect } from 'react';
import { streamChatCompletion } from '../../services/chatService';
import aboutData from '../../data/about.json';
import projectsData from '../../data/projects.json';

import ChatBotToggle from './ChatBotToggle';
import ChatBotWindow from './ChatBotWindow';
import ChatBotHeader from './ChatBotHeader';
import ChatBotWelcome from './ChatBotWelcome';
import ChatBotMessages from './ChatBotMessages';
import ChatBotInput from './ChatBotInput';

import { 
  ChatBotProps, 
  Message, 
  SuggestedQuery, 
  ChatBotDimensions, 
  ChatBotState 
} from './types';

import '../../css/components/chatbot/ChatBot.css';

const ChatBot: React.FC<ChatBotProps> = ({ className = '' }) => {
  // State management
  const [state, setState] = useState<ChatBotState>({
    isOpen: false,
    isMinimized: false,
    dimensions: { width: 400, height: 550 },
    isResizing: false,
    showHeyAnimation: false,
    showResetConfirmation: false,
  });

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Suggested queries configuration
  const suggestedQueries: SuggestedQuery[] = [
    { text: "What AI technologies does Andres specialize in?", icon: "🤖", category: 'skills' },
    { text: "Tell me about the FindIT project", icon: "🔍", category: 'projects' },
    { text: "Explain Novus Talk and magic-agents", icon: "🕸️", category: 'projects' },
    { text: "How can I contact Andres?", icon: "📧", category: 'contact' },
    { text: "What makes this portfolio unique?", icon: "✨", category: 'general' },
    { text: "Show me projects using LLMs", icon: "🧠", category: 'projects' }
  ];

  // Show "hey!" animation periodically when chatbot is closed
  useEffect(() => {
    if (!state.isOpen) {
      const showAnimation = () => {
        setState(prev => ({ ...prev, showHeyAnimation: true }));
        setTimeout(() => setState(prev => ({ ...prev, showHeyAnimation: false })), 3000);
      };

      // Show immediately after 5 seconds, then every 30 seconds
      const initialTimer = setTimeout(showAnimation, 5000);
      const intervalTimer = setInterval(showAnimation, 30000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(intervalTimer);
      };
    }
  }, [state.isOpen]);

  // Focus input field when chat opens
  useEffect(() => {
    if (state.isOpen && !state.isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [state.isOpen, state.isMinimized]);

  // Create system context with portfolio information
  const getSystemContext = (): Message => {
    const about = aboutData?.[0];
    const skills = about?.skills?.map(skill => `${skill.category}: ${skill.items.join(', ')}`).join('\n') || '';
    const projectSummary = projectsData.map(project => 
      `- ${project.title}: ${project.descriptionMD} (${project.tags?.join(', ')}) image: ${project.image}`
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
- LinkedIn: https://www.linkedin.com/in/arz-ai/
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

  // Toggle chatbot state
  const toggleChatbot = () => {
    setState(prev => {
      if (prev.isOpen && !prev.isMinimized) {
        return { ...prev, isMinimized: true };
      } else if (prev.isOpen && prev.isMinimized) {
        return { ...prev, isMinimized: false };
      } else {
        return { 
          ...prev, 
          isOpen: true, 
          isMinimized: false, 
          showHeyAnimation: false 
        };
      }
    });
  };

  // Close chatbot
  const closeChatbot = () => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      isMinimized: false,
      showResetConfirmation: false
    }));
  };

  // Handle reset confirmation
  const handleResetClick = () => {
    setState(prev => ({ ...prev, showResetConfirmation: true }));
  };

  const handleResetConfirm = () => {
    setMessages([]);
    setState(prev => ({ ...prev, showResetConfirmation: false }));
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleResetCancel = () => {
    setState(prev => ({ ...prev, showResetConfirmation: false }));
  };

  // Handle back to start
  const handleBackToStart = () => {
    setMessages([]);
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Handle input changes
  const handleInputChange = (value: string) => {
    setInput(value);
  };

  // Handle suggested query selection
  const handleSuggestedQuery = (query: string) => {
    setInput(query);
    setTimeout(() => {
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }, 100);
  };

  // Handle section scrolling
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Auto-minimize chatbot when navigating
      setState(prev => ({ ...prev, isMinimized: true }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
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
      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

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
            timestamp: new Date()
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

You can also explore the portfolio sections directly by clicking the navigation menu. Is there anything specific you'd like to know about Andres's work?`,
          timestamp: new Date()
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const { width, height } = state.dimensions;
    
    setState(prev => ({ ...prev, isResizing: true }));
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nw-resize';
    
    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = startX - ev.clientX;
      const deltaY = startY - ev.clientY;
      
      // Calculate new dimensions with constraints
      const newWidth = Math.max(320, Math.min(800, width + deltaX));
      const newHeight = Math.max(400, Math.min(700, height + deltaY));
      
      // Ensure the window doesn't go outside viewport bounds
      const maxWidth = window.innerWidth - 40; // 20px margin on each side
      const maxHeight = window.innerHeight - 120; // Account for toggle button and margins
      
      setState(prev => ({
        ...prev,
        dimensions: {
          width: Math.min(newWidth, maxWidth),
          height: Math.min(newHeight, maxHeight),
        }
      }));
    };
    
    const onMouseUp = () => {
      setState(prev => ({ ...prev, isResizing: false }));
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Check if there are any messages to show back to start button
  const hasMessages = messages.length > 0;

  return (
    <div className={`cb-container ${className}`} aria-live="polite">
      <ChatBotToggle
        isOpen={state.isOpen}
        isMinimized={state.isMinimized}
        showHeyAnimation={state.showHeyAnimation}
        onClick={toggleChatbot}
      />

      <ChatBotWindow
        isOpen={state.isOpen}
        isMinimized={state.isMinimized}
        dimensions={state.dimensions}
        isResizing={state.isResizing}
        onClose={closeChatbot}
        onMinimize={toggleChatbot}
        onResetConfirm={handleResetConfirm}
        onResizeStart={handleResizeStart}
      >
        <ChatBotHeader
          onClose={closeChatbot}
          onMinimize={toggleChatbot}
          onResetClick={handleResetClick}
          isMinimized={state.isMinimized}
          showResetConfirmation={state.showResetConfirmation}
          onResetConfirm={handleResetConfirm}
          onResetCancel={handleResetCancel}
        />
        
        {messages.length === 0 ? (
          <ChatBotWelcome
            suggestedQueries={suggestedQueries}
            onSuggestedQuery={handleSuggestedQuery}
            onScrollToSection={scrollToSection}
          />
        ) : (
          <ChatBotMessages
            messages={messages}
            isLoading={isLoading}
            hasMessages={hasMessages}
            onBackToStart={handleBackToStart}
          />
        )}
        
        <ChatBotInput
          input={input}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      </ChatBotWindow>
    </div>
  );
};

export default ChatBot; 