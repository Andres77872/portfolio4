import React from 'react';
import { Bot, User, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatAvatarProps {
  role: 'user' | 'assistant' | 'system';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
};

const ChatAvatar: React.FC<ChatAvatarProps> = ({
  role,
  className,
  size = 'md'
}) => {
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border shadow-sm',
        'transition-colors duration-200',
        'contrast-more:border-2',
        SIZE_CLASSES[size],
        isAssistant
          ? 'border-border bg-card text-primary'
          : isSystem
            ? 'border-border bg-muted text-muted-foreground'
            : 'border-primary/20 bg-primary text-primary-foreground',
        className
      )}
      aria-hidden="true"
    >
      {isAssistant ? (
        <Bot className="stroke-[2]" />
      ) : isSystem ? (
        <Terminal className="stroke-[2]" />
      ) : (
        <User className="stroke-[2]" />
      )}
    </div>
  );
};

export default ChatAvatar;
