import React from 'react';
import { ChatBotResizeHandleProps } from './types';
import '../../css/components/chatbot/ChatBotResizeHandle.css';

const ChatBotResizeHandle: React.FC<ChatBotResizeHandleProps> = ({
  onResizeStart
}) => {
  return (
    <div
      className="cb-resize-handle"
      title="Drag to resize"
      aria-label="Resize chat window"
      onMouseDown={onResizeStart}
    />
  );
};

export default ChatBotResizeHandle; 