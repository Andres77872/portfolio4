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
  const windowStyle = !isMinimized && isOpen
    ? { width: dimensions.width, height: dimensions.height }
    : undefined;

  return (
    <div
      ref={panelRef}
      className={cn(
        // Non-modal floating surface
        'absolute bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] right-[env(safe-area-inset-right)] z-50 flex flex-col overflow-visible',
        'rounded-2xl border border-border/70 font-sans outline-none',
        // Tokenized glass surface and contrast-aware separation
        'bg-card/90 text-card-foreground shadow-2xl shadow-foreground/20 backdrop-blur-xl backdrop-saturate-150',
        'ring-1 ring-border/40 contrast-more:border-border contrast-more:bg-card contrast-more:ring-2',
        // Safe-area/mobile sizing; remains floating, never a full-screen drawer/sheet
        'max-w-[min(calc(100vw_-_1rem_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)),42rem)]',
        'max-h-[min(calc(100dvh_-_7rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),44rem)]',
        'max-md:w-[min(calc(100vw_-_1rem_-_env(safe-area-inset-left)_-_env(safe-area-inset-right)),24rem)]',
        'max-md:max-h-[min(calc(100dvh_-_6rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),38rem)]',
        '2xl:w-[420px] 2xl:h-[600px]',
        // State: hidden
        !isOpen && 'invisible opacity-0 translate-y-2 pointer-events-none',
        // State: minimized
        isMinimized && 'invisible opacity-0 translate-y-2 pointer-events-none',
        // State: open
        isOpen && !isMinimized && 'visible opacity-100 translate-y-0',
        // Resizing
        isResizing && 'select-none transition-none',
        // Transition
        !isResizing && 'transition-[opacity,transform,visibility] duration-200 ease-out',
      )}
      style={windowStyle}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={isMinimized || !isOpen}
      tabIndex={-1}
      onKeyDown={onEscapeKeyDown}
    >
      {!isMinimized && isOpen && (
        <>
          {children}
        </>
      )}
    </div>
  );
};

export default ChatBotWindow;
