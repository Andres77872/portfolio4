import { memo } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { proseClasses } from '@/lib/prose';
import { cn } from '@/lib/utils';

import ChatErrorNotice from './ChatErrorNotice';
import ChatMarkdown from './ChatMarkdown';
import ChatProjectCards from './ChatProjectCards';
import type { AssistantTurn, ChatItem } from './conversation';
import { focusRing, monoLabel, panelTextButton } from './styles';

interface ChatTurnProps {
  item: ChatItem;
  isLast: boolean;
  busy: boolean;
  cardSlugs: readonly string[];
  onRetry(id: string): void;
  onNewChat(): void;
}

export function StatusDot() {
  return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-status-pulse" />;
}

function StoppedFooter({ turn, canRetry, onRetry }: { turn: AssistantTurn; canRetry: boolean; onRetry(id: string): void }) {
  return (
    <div className="mt-2 flex flex-col items-start gap-2">
      {!turn.content && <p className="text-sm text-muted-foreground">Stopped before an answer arrived.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <p className={monoLabel}>Stopped</p>
        {canRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRetry(turn.id)}
            className={cn(panelTextButton, focusRing)}
          >
            <RotateCcw />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

function AssistantTurnView({ turn, isLast, busy, cardSlugs, onRetry, onNewChat }: Omit<ChatTurnProps, 'item'> & { turn: AssistantTurn }) {
  const { status, content } = turn;
  const inFlight = status === 'pending' || status === 'streaming';
  // Retry (and every other follow-up action) belongs to the last turn only, and never mid-answer.
  const canRetry = isLast && !busy;

  return (
    <li aria-busy={inFlight}>
      <h3 className={cn(monoLabel, 'flex items-center gap-1.5')}>
        Assistant
        {status === 'pending' && (
          <>
            <StatusDot /> · Thinking…
          </>
        )}
        {status === 'streaming' && ' · Answering…'}
      </h3>
      {content && (
        <div className={cn(proseClasses('compact'), 'mt-1.5')}>
          <ChatMarkdown content={content} />
        </div>
      )}
      {status === 'stopped' &&
        (isLast ? (
          <StoppedFooter turn={turn} canRetry={canRetry} onRetry={onRetry} />
        ) : (
          <p className={cn(monoLabel, 'mt-2')}>Stopped</p>
        ))}
      {status === 'error' &&
        (isLast ? (
          <ChatErrorNotice
            kind={turn.error ?? 'unavailable'}
            canRetry={canRetry}
            onRetry={() => onRetry(turn.id)}
            onNewChat={onNewChat}
          />
        ) : (
          <p className={cn(monoLabel, 'mt-2')}>Not answered</p>
        ))}
      {status === 'complete' && cardSlugs.length > 0 && <ChatProjectCards slugs={cardSlugs} />}
    </li>
  );
}

/** One transcript entry: a plain-text visitor bubble or a full-width assistant answer. */
function ChatTurn({ item, ...rest }: ChatTurnProps) {
  if (item.role === 'user') {
    return (
      <li className="flex flex-col items-end motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
        <h3 className="sr-only">You</h3>
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-transparent bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground">
          {item.content}
        </p>
      </li>
    );
  }

  return <AssistantTurnView turn={item} {...rest} />;
}

export default memo(ChatTurn);
