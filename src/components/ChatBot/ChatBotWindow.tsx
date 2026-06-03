import React from 'react';
import { ChatBotWindowProps } from './types';
import { cn } from '@/lib/utils';

const ChatBotWindow: React.FC<ChatBotWindowProps> = ({
  isOpen,
  isMinimized,
  dimensions,
  isResizing,
  titleId,
  panelRef,
  onEscapeKeyDown,
  children
}) => {
  if (!isOpen || isMinimized) {
    return null;
  }

  const windowStyle = !isMinimized && isOpen
    ? { width: dimensions.width, height: dimensions.height }
    : undefined;

  return (
    <div
      ref={panelRef}
      className={cn(
        // Non-modal floating surface
        'absolute bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] right-[env(safe-area-inset-right)] z-50 flex flex-col overflow-hidden',
        'rounded-2xl border border-border bg-card font-sans text-card-foreground shadow-xl outline-none',
        'contrast-more:border-2 contrast-more:border-border',
        // Safe-area/mobile sizing; remains floating, never a full-screen drawer/sheet
        'max-w-[min(calc(100vw_-_1rem_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)),42rem)]',
        'max-h-[min(calc(100dvh_-_7rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),44rem)]',
        'max-md:w-[min(calc(100vw_-_1rem_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)),24rem)]',
        'max-md:max-h-[min(calc(100dvh_-_6rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),38rem)]',
        '2xl:w-[420px] 2xl:h-[600px]',
        // State: open
        'visible translate-y-0 opacity-100',
        // Resizing
        isResizing && 'select-none transition-none',
        // Transition
        !isResizing && 'transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none',
      )}
      style={windowStyle}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={false}
      tabIndex={-1}
      onKeyDown={onEscapeKeyDown}
    >
      {children}
    </div>
  );
};

export default ChatBotWindow;
