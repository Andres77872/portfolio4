// ChatBot type definitions

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface SuggestedQuery {
  text: string;
  icon?: string;
  category: 'general' | 'projects' | 'skills' | 'contact';
}

export interface ChatBotDimensions {
  width: number;
  height: number;
}

export interface ChatBotState {
  isOpen: boolean;
  isMinimized: boolean;
  dimensions: ChatBotDimensions;
  isResizing: boolean;
  showHeyAnimation: boolean;
  showResetConfirmation: boolean;
}

export interface ChatBotProps {
  className?: string;
}

export interface ChatBotToggleProps {
  isOpen: boolean;
  isMinimized: boolean;
  showHeyAnimation: boolean;
  onClick: () => void;
}

export interface ChatBotWindowProps {
  isOpen: boolean;
  isMinimized: boolean;
  dimensions: ChatBotDimensions;
  isResizing: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onResetConfirm: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export interface ChatBotHeaderProps {
  onClose: () => void;
  onMinimize: () => void;
  onResetClick: () => void;
  isMinimized: boolean;
  showResetConfirmation: boolean;
  onResetConfirm: () => void;
  onResetCancel: () => void;
}

export interface ChatBotMessagesProps {
  messages: Message[];
  isLoading: boolean;
  hasMessages: boolean;
  onBackToStart: () => void;
}

export interface ChatBotWelcomeProps {
  suggestedQueries: SuggestedQuery[];
  onSuggestedQuery: (query: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

export interface ChatBotInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export interface ChatBotResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
} 