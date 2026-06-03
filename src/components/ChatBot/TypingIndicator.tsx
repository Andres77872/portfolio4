import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm text-muted-foreground',
        className
      )}
    >
      <span>Assistant is typing</span>
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full bg-primary/60',
              'animate-bounce motion-reduce:animate-none'
            )}
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '600ms',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TypingIndicator;
