import { forwardRef } from 'react';
import { MessageSquareText } from 'lucide-react';

import { cn } from '@/lib/utils';

import { focusRing } from './styles';

interface ChatLauncherProps {
  unread: boolean;
  hidden: boolean;
  controlsId?: string;
  onOpen(): void;
  onPrefetch(): void;
}

/** "Ask about my work" pill. Its accessible name stays stable apart from the unread suffix. */
const ChatLauncher = forwardRef<HTMLButtonElement, ChatLauncherProps>(function ChatLauncher(
  { unread, hidden, controlsId, onOpen, onPrefetch },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-controls={controlsId}
      hidden={hidden}
      onClick={onOpen}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      onTouchStart={onPrefetch}
      className={cn(
        'fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-50',
        'inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card/90 px-4 text-sm font-medium text-foreground',
        'shadow-lg shadow-black/10 backdrop-blur-md transition-colors duration-150 hover:border-primary/35',
        'contrast-more:border-foreground/60 motion-reduce:transition-none max-xs:px-3.5',
        focusRing,
      )}
    >
      <MessageSquareText aria-hidden className="size-4 text-primary" />
      {/* Under 480 px only "Ask" shows; the name stays "Ask about my work" (WCAG 2.5.3). */}
      <span>
        Ask <span className="max-xs:sr-only">about my work</span>
        {unread && <span className="sr-only">, new reply</span>}
      </span>
      {unread && (
        <span
          aria-hidden
          className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-card forced-colors:bg-[Highlight]"
        />
      )}
    </button>
  );
});

export default ChatLauncher;
