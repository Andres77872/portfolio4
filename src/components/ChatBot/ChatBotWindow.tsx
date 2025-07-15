import React from 'react';
import { ChatBotWindowProps } from './types';
import ChatBotResizeHandle from './ChatBotResizeHandle';
import '../../css/components/chatbot/ChatBotWindow.css';

const ChatBotWindow: React.FC<ChatBotWindowProps> = ({
  isOpen,
  isMinimized,
  dimensions,
  isResizing,
  onClose,
  onMinimize,
  onResetConfirm,
  onResizeStart,
  children
}) => {
  // Determine chat window class based on state
  const getWindowClass = () => {
    if (!isOpen) return "cb-window cb-window--hidden";
    if (isMinimized) return "cb-window cb-window--minimized";
    return `cb-window cb-window--open ${isResizing ? 'cb-window--resizing' : ''}`;
  };

  const windowStyle = !isMinimized && isOpen 
    ? { width: dimensions.width, height: dimensions.height } 
    : undefined;

  return (
    <div
      className={getWindowClass()}
      style={windowStyle}
      aria-hidden={isMinimized || !isOpen}
    >
      {!isMinimized && isOpen && (
        <>
          <ChatBotResizeHandle onResizeStart={onResizeStart} />
          {children}
        </>
      )}
    </div>
  );
};

export default ChatBotWindow; 