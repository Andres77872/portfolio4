import React from 'react';
import { ChatBotResizeHandleProps } from './types';
import { cn } from '@/lib/utils';

const ChatBotResizeHandle: React.FC<ChatBotResizeHandleProps> = ({
  onResizeStart,
  onResizeKeyDown,
  dimensions
}) => {
  const dimensionText = `Current size: ${dimensions.width} pixels wide by ${dimensions.height} pixels tall. Arrow Left or Up increases size from this corner; Arrow Right or Down decreases size. Hold Shift for larger steps.`;

  return (
    <div
      className={cn(
        'absolute left-0 top-0 z-50',
        'hidden h-8 w-8 cursor-nw-resize md:flex',
        'items-start justify-start p-1.5',
        'rounded-tl-2xl text-muted-foreground/60',
        'transition-colors duration-150 motion-reduce:transition-none',
        'hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        'contrast-more:border-border contrast-more:text-foreground',
        '[@media_(pointer:coarse)]:hidden',
      )}
      title="Drag to resize"
      aria-label="Resize chat window"
      aria-valuemin={320}
      aria-valuemax={800}
      aria-valuenow={dimensions.width}
      aria-valuetext={dimensionText}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onResizeStart}
      onKeyDown={onResizeKeyDown}
    >
      <span className="relative block h-3.5 w-3.5" aria-hidden="true">
        <span className="absolute left-0 top-0 h-px w-3.5 bg-current" />
        <span className="absolute left-0 top-0 h-3.5 w-px bg-current" />
      </span>
      <span className="sr-only">{dimensionText}</span>
    </div>
  );
};

export default ChatBotResizeHandle;
