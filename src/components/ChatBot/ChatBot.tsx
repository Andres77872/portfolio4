import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

  // Memoize suggested queries configuration to prevent recreation
  const suggestedQueries: SuggestedQuery[] = useMemo(() => [
    { text: "What AI technologies does Andres specialize in?", icon: "🤖", category: 'skills' },
    { text: "Tell me about the FindIT project", icon: "🔍", category: 'projects' },
    { text: "Explain Novus Talk and magic-agents", icon: "🕸️", category: 'projects' },
    { text: "How can I contact Andres?", icon: "📧", category: 'contact' },
    { text: "What makes this portfolio unique?", icon: "✨", category: 'general' },
    { text: "Show me projects using LLMs", icon: "🧠", category: 'projects' }
  ], []);

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

  // Memoize system context to prevent recreation on every render
  const systemContext = useMemo((): Message => {
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
  }, [aboutData, projectsData]);

  // Memoize toggle chatbot function to prevent recreation
  const toggleChatbot = useCallback(() => {
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
  }, []);

  // Memoize close chatbot function
  const closeChatbot = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      isMinimized: false,
      showResetConfirmation: false
    }));
  }, []);

  // Memoize reset handlers
  const handleResetClick = useCallback(() => {
    setState(prev => ({ ...prev, showResetConfirmation: true }));
  }, []);

  const handleResetConfirm = useCallback(() => {
    setMessages([]);
    setState(prev => ({ ...prev, showResetConfirmation: false }));
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleResetCancel = useCallback(() => {
    setState(prev => ({ ...prev, showResetConfirmation: false }));
  }, []);

  // Memoize back to start handler
  const handleBackToStart = useCallback(() => {
    setMessages([]);
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Memoize input change handler
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Memoize suggested query handler
  const handleSuggestedQuery = useCallback((query: string) => {
    setInput(query);
    setTimeout(() => {
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }, 100);
  }, []);

  // Memoize section scrolling handler
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Auto-minimize chatbot when navigating
      setState(prev => ({ ...prev, isMinimized: true }));
    }
  }, []);

  // Handle form submission with optimized error handling
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Include system context with each request
      const messagesWithContext = [systemContext, ...messages, userMessage];

      // Call the OpenAI-compatible API with streaming
      const stream = await streamChatCompletion({
        messages: messagesWithContext,
      });

      // Set up streaming
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Create stable timestamp for the streaming message to prevent re-renders
      const assistantTimestamp = new Date();

      // Add empty assistant message with stable timestamp
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: assistantTimestamp 
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update the last message content only (keeping same timestamp for stable key)
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content: assistantMessage,
            // Keep the same timestamp to maintain stable React key
            timestamp: assistantTimestamp
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
  }, [input, messages, systemContext]);

  // Memoize resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
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
  }, [state.dimensions]);

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

export default React.memo(ChatBot); 