import React from 'react';
import { Grip } from 'lucide-react';
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
        'hidden h-7 w-7 cursor-nw-resize md:flex',
        'items-center justify-center',
        'rounded-tl-2xl rounded-br-lg border-b border-r border-transparent',
        'bg-card/20 text-muted-foreground/50',
        'transition-colors duration-150 motion-reduce:transition-none',
        'hover:border-border/70 hover:bg-primary/10 hover:text-primary',
        'focus-visible:border-ring/60 focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
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
      <Grip
        className={cn(
          'h-3.5 w-3.5',
          'transition-colors duration-150 motion-reduce:transition-none',
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{dimensionText}</span>
    </div>
  );
};

export default ChatBotResizeHandle;
