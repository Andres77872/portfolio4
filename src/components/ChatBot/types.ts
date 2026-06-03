import type React from 'react';

import type { ChatConsumer } from '@/config/chatConfig';

// ChatBot type definitions

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'streaming' | 'complete' | 'error';

export type ChatBotMode = 'closed' | 'open' | 'minimized';

export interface Message {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  status?: ChatMessageStatus;
  errorMessage?: string;
  retryForMessageId?: string;
}

export interface ChatRequestMessage {
  role: ChatMessageRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatRequestMessage[];
}

export interface ChatServiceOptions {
  signal?: AbortSignal;
  consumer?: ChatConsumer;
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

export interface ChatBotUiState {
  mode: ChatBotMode;
  showResetConfirmation: boolean;
}

export type ChatBotUiAction =
  | { type: 'OPEN' }
  | { type: 'MINIMIZE' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE_FROM_TRIGGER' }
  | { type: 'SHOW_RESET_CONFIRMATION' }
  | { type: 'HIDE_RESET_CONFIRMATION' };

export interface ChatBotState extends ChatBotUiState {
  dimensions: ChatBotDimensions;
  isResizing: boolean;
  showPromptCue: boolean;
}

export interface UseChatStreamResult {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  retryLastFailed: () => Promise<void>;
  resetConversation: () => void;
  cancelActiveStream: () => void;
}

export interface UseChatResizeResult {
  dimensions: ChatBotDimensions;
  isResizing: boolean;
  startPointerResize: (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
  handleResizeKeyDown: (event: React.KeyboardEvent) => void;
}

export interface ChatBotProps {
  className?: string;
}

export interface ChatBotToggleProps {
  isOpen: boolean;
  isMinimized: boolean;
  showPromptCue: boolean;
  onClick: () => void;
  rootRef?: React.RefObject<HTMLDivElement>;
}

export interface ChatBotWindowProps {
  isOpen: boolean;
  isMinimized: boolean;
  dimensions: ChatBotDimensions;
  isResizing: boolean;
  titleId: string;
  panelRef?: React.RefObject<HTMLDivElement>;
  onEscapeKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

export interface ChatBotHeaderProps {
  titleId: string;
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
  isStreaming: boolean;
  onRetryLastFailed?: () => void;
}

export interface ChatBotWelcomeProps {
  suggestedQueries: SuggestedQuery[];
  onSuggestedQuery: (query: string) => void;
  onScrollToSection: (sectionId: string) => void;
}

export interface ChatBotInputProps {
  input: string;
  isStreaming: boolean;
  onInputChange: (value: string) => void;
  onSubmitMessage: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export interface ChatBotResizeHandleProps {
  onResizeStart: (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => void;
  onResizeKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  dimensions: ChatBotDimensions;
}
